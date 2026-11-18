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
    await request(base + '/dairy/' + stored.id, {
      token, method: 'PUT', body: { ...record, liters: 12, session: 'MORNING' },
    })
    const evening = await request(base + '/dairy', {
      token, method: 'POST', expected: 201, body: { ...record, liters: 12, session: 'EVENING' },
    })
    assert.equal((await request(base + '/quality', { token })).counts.active, 0)
    const preserved = await request(base + '/dairy/' + stored.id, {
      token, method: 'PUT', body: { ...record, liters: 12 },
    })
    assert.equal(preserved.session, 'MORNING')
    await request(base + '/dairy/' + evening.id, {
      token, method: 'PUT', expected: 400, body: { ...record, liters: 12, session: 'INVALID' },
    })
    await request(base + '/dairy/' + evening.id, {
      token, method: 'PUT', body: { ...record, liters: 12, session: 'MORNING' },
    })
    const duplicateReport = await request(base + '/quality', { token })
    assert.equal(duplicateReport.findings.filter(item => item.active && item.ruleId === 'duplicate').length, 1)
    const cleared = await request(base + '/dairy/' + evening.id, {
      token, method: 'PUT', body: { ...record, liters: 12, session: null },
    })
    assert.equal(cleared.session, null)
  } finally {
    await request(base, { token, method: 'DELETE' })
  }
})

test('species findings clear after record entry and remain owner-scoped', { skip: !api }, async () => {
  async function request(path, token, method = 'GET', body, status = 200) {
    const response = await fetch(api + path, {
      method, headers: { 'Content-Type': 'application/json', ...(token && { Authorization: 'Bearer ' + token }) },
      body: JSON.stringify(body),
    })
    const payload = await response.json()
    assert.equal(response.status, status, JSON.stringify(payload))
    return payload.data ?? payload
  }
  const { token } = await request('/auth/register', null, 'POST', {
    username: 'species-' + crypto.randomUUID(), password: crypto.randomUUID(),
  })
  const other = await request('/auth/register', null, 'POST', {
    username: 'species-other-' + crypto.randomUUID(), password: crypto.randomUUID(),
  })
  const pet = await request('/pets', token, 'POST', { name: 'Species test', species: 'cat' }, 201)
  const base = '/pets/' + pet.id
  try {
    const guide = await request(base + '/guide', token)
    assert.equal(guide[0].id, 'companion-records')
    assert.ok(guide[0].text.ur)
    await request(base + '/guide', other.token, 'GET', undefined, 404)
    await request(base + '/vetvisits', token, 'POST', { reason: 'Check', visitDate: '2026-10-01' }, 201)
    const report = await request(base + '/quality', token)
    const finding = report.findings.find(item => item.ruleId === 'weightHistoryMissing')
    assert.ok(finding.active)
    assert.ok(finding.source.url.startsWith('https://www.aaha.org/'))
    await request(base + '/quality/findings/' + finding.id, token, 'PATCH', { status: 'DISMISSED' })
    const repeated = await request(base + '/quality/check', token, 'POST')
    assert.equal(repeated.findings.find(item => item.id === finding.id).status, 'DISMISSED')
    await request(base + '/weights', token, 'POST', { weight: 4 }, 201)
    const corrected = await request(base + '/quality', token)
    assert.equal(corrected.findings.find(item => item.id === finding.id).active, false)
  } finally {
    await request(base, token, 'DELETE')
  }
})
