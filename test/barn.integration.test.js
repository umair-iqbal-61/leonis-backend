import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { test } from 'node:test'
const database = process.env.LEONIS_TEST_DATABASE_URL, api = process.env.LEONIS_TEST_API_URL

test('barn ownership, transfers, ledger history, settlement and report integrity on PostgreSQL', { skip: !database || !api }, async () => {
  const db = new URL(database)
  assert.ok(['localhost', '127.0.0.1'].includes(db.hostname) && db.pathname === '/leonis_smoke')
  assert.equal(api, 'http://localhost:7462/api')
  process.env.DATABASE_URL = database
  const { default: prisma } = await import('../src/lib/prisma.js')
  const users = []
  const existingIds = (await prisma.pet.findMany({ select: { id: true } })).map(item => item.id)
  async function request(path, token, method = 'GET', body, expected = 200) {
    const response = await fetch(api + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
    const payload = await response.json()
    assert.equal(response.status, expected, path + ': ' + JSON.stringify(payload))
    return payload.data ?? payload
  }
  const entryBody = (category, amount, extra = {}) => ({ occurredOn: '2025-01-05', category, amount, description: 'Test record', requestId: randomUUID(), ...extra })
  try {
    for (let i = 0; i < 2; i++) {
      const username = 'barn-smoke-' + randomUUID()
      const { token } = await request('/auth/register', null, 'POST', { username, password: 'disposable-password' })
      const user = await prisma.user.findUniqueOrThrow({ where: { username } })
      users.push({ ...user, token })
    }
    const [owner, other] = users
    await request('/barns', null, 'GET', undefined, 400)
    const cow = await request('/pets', owner.token, 'POST', { name: 'Barn cow', species: 'dairy-cattle' }, 201)
    const cat = await request('/pets', owner.token, 'POST', { name: 'Cat', species: 'cat' }, 201)
    const foreign = await request('/pets', other.token, 'POST', { name: 'Private cow', species: 'dairy-cattle' }, 201)
    const barnBody = { name: 'Barn A', location: 'Lahore', requestId: randomUUID() }
    const a = await request('/barns', owner.token, 'POST', barnBody, 201)
    assert.equal((await request('/barns', owner.token, 'POST', barnBody, 201)).id, a.id)
    const b = await request('/barns', owner.token, 'POST', { name: 'Barn B', requestId: randomUUID() }, 201)
    const path = '/barns/' + a.id, pathB = '/barns/' + b.id
    assert.equal((await request('/barns', other.token)).length, 0)
    for (const suffix of ['', '/entries', '/report?from=2025-01-01&to=2025-01-31']) await request(path + suffix, other.token, 'GET', undefined, 404)
    await request(path + '/assignments', owner.token, 'POST', { petId: foreign.id, startedOn: '2025-01-01', requestId: randomUUID() }, 404)
    await request(path + '/assignments', owner.token, 'POST', { petId: cat.id, startedOn: '2025-01-01', requestId: randomUUID() }, 400)
    const assignment = { petId: cow.id, startedOn: '2025-01-01', requestId: randomUUID() }
    const membership = await request(path + '/assignments', owner.token, 'POST', assignment, 201)
    assert.equal((await request(path + '/assignments', owner.token, 'POST', assignment, 201)).id, membership.id)
    await request(path, owner.token, 'PATCH', { name: a.name, archived: true, expectedVersion: a.version }, 409)
    const feedInput = entryBody('FEED', '50.00', { petId: cow.id, quantity: '10' })
    const feed = await request(path + '/entries', owner.token, 'POST', feedInput, 201)
    assert.equal((await request(path + '/entries', owner.token, 'POST', feedInput, 201)).id, feed.id)
    await request(path + '/entries', other.token, 'POST', feedInput, 404)
    await request(path + '/entries', owner.token, 'POST', entryBody('ANIMAL_SALE', '20', { petId: foreign.id }), 409)
    const milk = await request(path + '/entries', owner.token, 'POST', entryBody('MILK_SALE', '100', { quantity: '5' }), 201)
    const payment = { amount: '20', paidOn: '2025-01-07', requestId: randomUUID() }
    let paidFeed = await request(path + `/entries/${feed.id}/payments`, owner.token, 'POST', payment, 201)
    assert.equal((await request(path + `/entries/${feed.id}/payments`, owner.token, 'POST', payment, 201)).paid, '20.00')
    await request(path + `/entries/${feed.id}/payments`, other.token, 'POST', payment, 404)
    await request(path + `/entries/${milk.id}/payments`, owner.token, 'POST', { amount: '40', paidOn: '2025-01-06', requestId: randomUUID() }, 201)
    await request(path + `/entries/${feed.id}`, owner.token, 'PATCH', { ...feedInput, expectedVersion: 0 }, 409)
    await request(path + `/entries/${feed.id}`, owner.token, 'PATCH', { ...feedInput, amount: '19', expectedVersion: paidFeed.version }, 409)
    await request(path + `/entries/${feed.id}`, owner.token, 'PATCH', { ...feedInput, category: 'OTHER_INCOME', expectedVersion: paidFeed.version }, 409)
    await request(path + `/entries/${feed.id}`, owner.token, 'DELETE', { expectedVersion: paidFeed.version }, 409)
    paidFeed = await request(path + `/entries/${feed.id}`, owner.token, 'PATCH', { ...feedInput, description: 'Corrected note', expectedVersion: paidFeed.version })
    for (const [recordedOn, liters] of [['2025-01-09', 12], ['2025-01-10', 20], ['2025-01-11', -2]]) await request(`/pets/${cow.id}/dairy`, owner.token, 'POST', { kind: 'MILK_YIELD', recordedOn, liters, session: 'MORNING' }, 201)
    const transferBody = { petId: cow.id, startedOn: '2025-01-10', requestId: randomUUID() }
    const transferred = await request(pathB + '/assignments', owner.token, 'POST', transferBody, 201)
    assert.equal((await request(pathB + '/assignments', owner.token, 'POST', transferBody, 201)).id, transferred.id)
    await request(path + '/assignments', owner.token, 'POST', { ...transferBody, requestId: randomUUID(), startedOn: '2025-01-09' }, 409)
    const report = await request(path + '/report?from=2025-01-01&to=2025-01-31', owner.token)
    assert.equal(report.summary.operatingMargin, '50.00')
    assert.equal(report.shared.operatingIncome, '100.00')
    assert.equal(report.animals[0].operatingMargin, null)
    assert.equal(report.cash.receipts, '40.00'); assert.equal(report.cash.payments, '20.00')
    assert.equal(report.outstanding.receivable, '60.00'); assert.equal(report.outstanding.payable, '30.00')
    assert.equal(report.milk.liters, '12.0000'); assert.equal(report.milk.soldLiters, '5.000')
    const bReport = await request(pathB + '/report?from=2025-01-01&to=2025-01-31', owner.token)
    assert.equal(bReport.milk.liters, '20.0000'); assert.equal(bReport.milk.excludedCount, 1)
    assert.equal((await request(path + '/entries', owner.token)).total, 2)
    const outcomes = await Promise.all([1, 2].map(async () => {
      const response = await fetch(api + path + `/entries/${feed.id}/payments`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${owner.token}` }, body: JSON.stringify({ amount: '25', paidOn: '2025-01-08', requestId: randomUUID() }) })
      return response.status
    }))
    assert.deepEqual(outcomes.sort(), [201, 409])
    paidFeed = (await request(path + '/entries', owner.token)).entries.find(item => item.id === feed.id)
    assert.equal(paidFeed.paid, '45.00'); assert.equal(paidFeed.outstanding, '5.00')
    await request(path + `/entries/${feed.id}/payments/${paidFeed.payments[0].id}`, owner.token, 'DELETE', { expectedVersion: 0 }, 409)
    const afterDelete = await request(path + `/entries/${feed.id}/payments/${paidFeed.payments[0].id}`, owner.token, 'DELETE', { expectedVersion: paidFeed.version })
    assert.equal(afterDelete.paid, '20.00')
    const bEntry = await request(pathB + '/entries', owner.token, 'POST', entryBody('VET', '10', { petId: cow.id }), 201)
    await request(pathB + `/memberships/${transferred.id}/end`, owner.token, 'POST', { endedOn: '2025-01-15' })
    await request(pathB, owner.token, 'PATCH', { name: b.name, archived: true, expectedVersion: b.version })
    await request(pathB + '/entries', owner.token, 'POST', entryBody('FEED', '10'), 409)
    await request(pathB + `/entries/${bEntry.id}/payments`, owner.token, 'POST', { amount: '5', paidOn: '2025-02-01', requestId: randomUUID() }, 201)
    const february = await request(pathB + '/report?from=2025-02-01&to=2025-02-28', owner.token)
    assert.equal(february.cash.payments, '5.00'); assert.equal(february.outstanding.payable, '5.00')
    const purchase = await request(path + '/entries', owner.token, 'POST', entryBody('ANIMAL_PURCHASE', '1000', { petId: cow.id }), 201)
    await request(`/pets/${cow.id}`, owner.token, 'DELETE')
    const retained = (await request(path + '/entries', owner.token)).entries.find(item => item.id === purchase.id)
    assert.equal(retained.petId, null); assert.equal(retained.animalReference, cow.id); assert.equal(retained.animalName, cow.name)
    await request(path + `/entries/${purchase.id}`, owner.token, 'PATCH', { ...purchase, petId: null, keepDeletedAnimal: true, occurredOn: '2025-01-05', description: 'History retained', expectedVersion: retained.version })
    const afterIds = new Set((await prisma.pet.findMany({ select: { id: true } })).map(item => item.id))
    assert.ok(existingIds.every(id => afterIds.has(id)))
  } finally {
    const userIds = users.map(item => item.id)
    const barns = await prisma.barn.findMany({ where: { userId: { in: userIds } }, select: { id: true } })
    await prisma.barnEntry.deleteMany({ where: { barnId: { in: barns.map(item => item.id) } } })
    await prisma.barnMembership.deleteMany({ where: { barnId: { in: barns.map(item => item.id) } } })
    await prisma.barn.deleteMany({ where: { userId: { in: userIds } } })
    await prisma.pet.deleteMany({ where: { userId: { in: userIds } } })
    await prisma.user.deleteMany({ where: { id: { in: userIds } } })
    await prisma.$disconnect()
  }
})
