import assert from 'node:assert/strict'
import { test } from 'node:test'

const api = process.env.LEONIS_TEST_API

test('owner can review and resolve automatically refreshed findings', { skip: !api }, async () => {
  async function request(path, { token, method = 'GET', body, expected = 200 } = {}) {
    const result = await fetch(api + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
      body: JSON.stringify(body),
    })
    const payload = await result.json()
    assert.equal(result.status, expected, JSON.stringify(payload))
    return payload.data ?? payload
  }

  const register = username => request('/auth/register', {
    method: 'POST', body: { username: `quality-${username}-${crypto.randomUUID()}`, password: crypto.randomUUID() },
  })
  const { token } = await register('owner')
  const other = (await register('other')).token
  const animal = await request('/pets', {
    token, method: 'POST', expected: 201, body: { name: 'Integration cow', species: 'dairy-cattle' },
  })
  const base = `/pets/${animal.id}`
  const record = { kind: 'MILK_YIELD', recordedOn: '2025-06-01', liters: null }

  try {
    const stored = await request(base + '/dairy', { token, method: 'POST', expected: 201, body: record })
    let report = await request(base + '/quality', { token })
    assert.equal(report.counts.active, 1)
    const [finding] = report.findings
    assert.equal(finding.ruleId, 'milkRequired')

    await request(base + '/quality', { token: other, expected: 404 })
    await request(base + '/quality/check', { token: other, method: 'POST', expected: 404 })
    await request(base + '/dairy', { token: other, expected: 404 })
    const reviewPath = base + '/quality/findings/' + finding.id
    const ownOtherAnimal = await request('/pets', {
      token: other, method: 'POST', expected: 201, body: { name: 'Other animal', species: 'cat' },
    })
    try {
      await request('/pets/' + ownOtherAnimal.id + '/quality/findings/' + finding.id, {
        token: other, method: 'PATCH', expected: 404, body: { status: 'DISMISSED' },
      })
    } finally {
      await request('/pets/' + ownOtherAnimal.id, { token: other, method: 'DELETE' })
    }
    await request(reviewPath, { token, method: 'PATCH', expected: 409, body: { status: 'RESOLVED' } })
    await request(reviewPath, { token, method: 'PATCH', body: { status: 'REVIEWED' } })
    const [recheck, repeated] = await Promise.all([
      request(base + '/quality/check', { token, method: 'POST' }),
      request(base + '/quality/check', { token, method: 'POST' }),
    ])
    for (const result of [recheck, repeated]) {
      assert.equal(result.findings.length, 1)
      assert.equal(result.findings[0].id, finding.id)
      assert.equal(result.findings[0].status, 'REVIEWED')
    }
    await request(base + '/dairy/' + stored.id, { token, method: 'PUT', body: { ...record, liters: 12 } })
    await request(reviewPath, { token, method: 'PATCH', body: { status: 'RESOLVED' } })
    report = await request(base + '/quality', { token })
    assert.equal(report.counts.active, 0)
    assert.equal(report.counts.resolved, 1)
    assert.equal(report.findings[0].id, finding.id)
  } finally {
    await request(base, { token, method: 'DELETE' })
  }
})
