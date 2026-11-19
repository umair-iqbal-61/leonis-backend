// Opt-in only: use the disposable localhost leonis_smoke database and backend on port 7462.
import assert from 'node:assert/strict'
import { test } from 'node:test'
const database = process.env.LEONIS_TEST_DATABASE_URL
const api = process.env.LEONIS_TEST_API_URL
const enabled = database && api

test('marketplace lifecycle, privacy, ownership and filters against PostgreSQL', { skip: !enabled }, async () => {
  const db = new URL(database)
  assert.ok(['localhost', '127.0.0.1'].includes(db.hostname) && db.pathname === '/leonis_smoke', 'Use the disposable local database only')
  assert.equal(api, 'http://localhost:7462/api')
  process.env.DATABASE_URL = database
  const { default: prisma } = await import('../src/lib/prisma.js')
  const users = []
  async function request(path, token, method = 'GET', body, expected = 200) {
    const response = await fetch(api + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
    const data = await response.json()
    assert.equal(response.status, expected, path + ': ' + JSON.stringify(data))
    return data
  }
  try {
    for (let i = 0; i < 2; i++) {
      const username = `market-smoke-${Date.now()}-${i}`
      const session = await request('/auth/register', null, 'POST', { username, password: 'disposable-password' })
      const user = await prisma.user.findUniqueOrThrow({ where: { username } })
      users.push({ ...user, token: session.token })
    }
    const [owner, stranger] = users
    await request('/listings/mine', null, 'GET', undefined, 400)
    await request('/listings/not-an-id', null, 'GET', undefined, 404)
    const input = { title: 'Test animal', description: 'Public description', species: 'dairy-cattle', breed: 'Sahiwal', age: 3, price: '190000', location: 'SmokeTown', phone: '03001234567', whatsapp: '+923007654321' }
    await request('/listings', null, 'POST', input, 400)
    await request('/listings', owner.token, 'POST', { ...input, price: -1 }, 400)
    const { data: draft } = await request('/listings', owner.token, 'POST', { ...input, status: 'PUBLISHED', userId: stranger.id }, 201)
    const path = `/listings/mine/${draft.id}`
    assert.equal(draft.status, 'DRAFT')
    await request(`/listings/${draft.id}`, null, 'GET', undefined, 404)
    assert.ok(!(await request('/listings?location=SmokeTown')).data.some(item => item.id === draft.id))
    await request(path, stranger.token, 'GET', undefined, 404)
    await request(path, stranger.token, 'PATCH', input, 404)
    await request(path + '/publish', stranger.token, 'POST', { consent: true }, 404)
    await request(path + '/status', stranger.token, 'POST', { status: 'SOLD' }, 404)
    await request(path, stranger.token, 'DELETE', undefined, 404)
    await request(path + '/publish', owner.token, 'POST', { consent: false }, 400)
    await request(path + '/publish', owner.token, 'POST', { consent: true }, 409)
    const invalidUpload = new FormData()
    invalidUpload.append('photo', new Blob(['not an image'], { type: 'image/jpeg' }), 'fake.jpg')
    for (const [token, expected] of [[stranger.token, 404], [owner.token, 400]]) {
      const response = await fetch(api + path + '/photos', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: invalidUpload })
      assert.equal(response.status, expected)
    }
    // Seed photo metadata only. Cloudinary uploads require separately configured credentials.
    await prisma.listingPhoto.create({ data: { listingId: draft.id, url: 'http://localhost:5173/leonis-cat.jpg', storageKey: 'disposable-smoke-placeholder' } })
    await prisma.listingPhoto.createMany({ data: Array.from({ length: 4 }, (_, index) => ({
      listingId: draft.id, url: 'http://localhost:5173/leonis-cat.jpg', storageKey: 'disposable-smoke-' + index,
    })) })
    const overflowUpload = new FormData()
    overflowUpload.append('photo', new Blob([new Uint8Array([255, 216, 255, 0])], { type: 'image/jpeg' }), 'sixth.jpg')
    const overflowResponse = await fetch(api + path + '/photos', { method: 'POST', headers: { Authorization: `Bearer ${owner.token}` }, body: overflowUpload })
    assert.equal(overflowResponse.status, 409)
    await request(path + '/publish', owner.token, 'POST', { consent: true })
    const detail = (await request(`/listings/${draft.id}`)).data
    assert.equal(detail.phone, '+923001234567'); assert.equal(detail.whatsapp, '+923007654321')
    for (const field of ['userId', 'user', 'pets', 'notes']) assert.equal(Object.hasOwn(detail, field), false)
    assert.equal(Object.hasOwn(detail.photos[0], 'storageKey'), false)
    const found = await request('/listings?species=dairy-cattle&location=smoketown')
    assert.ok(found.data.some(item => item.id === draft.id))
    assert.ok(!(await request('/listings?species=cat&location=SmokeTown')).data.some(item => item.id === draft.id))
    assert.equal(Object.hasOwn(found.data[0], 'phone'), false)
    await request('/listings?species=bad', null, 'GET', undefined, 400)
    await request('/listings?page=-1', null, 'GET', undefined, 400)
    await request(path + '/status', owner.token, 'POST', { status: 'SOLD' })
    const sold = (await request(`/listings/${draft.id}`)).data
    assert.equal(sold.status, 'SOLD'); assert.equal(Object.hasOwn(sold, 'phone'), false); assert.equal(Object.hasOwn(sold, 'whatsapp'), false)
    assert.ok(!(await request('/listings?location=SmokeTown')).data.some(item => item.id === draft.id))
    await request(path, owner.token, 'PATCH', { ...input, title: 'Revised listing' })
    await request(`/listings/${draft.id}`, null, 'GET', undefined, 404)
    await request(path + '/publish', owner.token, 'POST', { consent: true })
    await request(path, owner.token, 'PATCH', { ...input, price: '195000' })
    await request(`/listings/${draft.id}`, null, 'GET', undefined, 404)
    await request(path + '/publish', owner.token, 'POST', { consent: true })
    await request(path + '/status', owner.token, 'POST', { status: 'DRAFT' })
    await request(`/listings/${draft.id}`, null, 'GET', undefined, 404)
    // Avoid external storage calls for seeded metadata, then exercise actual deletion.
    await prisma.listingPhoto.deleteMany({ where: { listingId: draft.id } })
    await request(path, owner.token, 'DELETE')
    await request(path, owner.token, 'GET', undefined, 404)
    await prisma.listing.createMany({ data: Array.from({ length: 21 }, (_, index) => ({
      ...input, title: 'Page test ' + index, userId: owner.id, status: 'PUBLISHED', publishedAt: new Date(),
    })) })
    const pageOne = await request('/listings?location=SmokeTown&page=1')
    const pageTwo = await request('/listings?location=SmokeTown&page=2')
    assert.equal(pageOne.total, 21); assert.equal(pageOne.data.length, 20); assert.equal(pageTwo.data.length, 1)
    assert.ok(!pageOne.data.some(item => item.id === pageTwo.data[0].id))
  } finally {
    for (const user of users) {
      await prisma.listing.deleteMany({ where: { userId: user.id } })
      await prisma.user.delete({ where: { id: user.id } })
    }
    await prisma.$disconnect()
  }
})
