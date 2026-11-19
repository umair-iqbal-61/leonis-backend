import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { test } from 'node:test'
const database = process.env.LEONIS_TEST_DATABASE_URL, api = process.env.LEONIS_TEST_API_URL

test('store roles, authoritative checkout, quotes, inventory and idempotency on PostgreSQL', { skip: !database || !api }, async () => {
  const db = new URL(database)
  assert.ok(['localhost', '127.0.0.1'].includes(db.hostname) && db.pathname === '/leonis_smoke')
  assert.equal(api, 'http://localhost:7462/api')
  process.env.DATABASE_URL = database
  const { default: prisma } = await import('../src/lib/prisma.js')
  const users = [], productIds = []
  const oldSettings = await prisma.storeSettings.findUnique({ where: { id: 1 } })
  async function request(path, token, method = 'GET', body, expected = 200) {
    const response = await fetch(api + '/store' + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
    const data = await response.json(); assert.equal(response.status, expected, path + ': ' + JSON.stringify(data)); return data.data
  }
  const address = { recipientName: 'Smoke buyer', phone: '03001234567', address: '12 Test street', city: 'Lahore', province: 'Punjab' }
  try {
    for (let i = 0; i < 3; i++) {
      const username = 'store-test-' + Date.now() + '-' + i
      const response = await fetch(api + '/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password: 'disposable-password', isStoreAdmin: true }) })
      const { token } = await response.json()
      const user = await prisma.user.findUniqueOrThrow({ where: { username } })
      assert.equal(user.isStoreAdmin, false)
      users.push({ ...user, token })
    }
    const [admin, buyer, other] = users
    await request('/admin/products', buyer.token, 'GET', undefined, 403)
    await request('/admin/settings', buyer.token, 'PUT', { checkoutEnabled: true }, 403)
    await prisma.user.update({ where: { id: admin.id }, data: { isStoreAdmin: true } })
    assert.equal((await request('/access', admin.token)).isAdmin, true)
    await request('/admin/settings', admin.token, 'PUT', { standardFee: '250', standardWeightLimitGrams: 2000, checkoutEnabled: false })
    const baseProduct = { name: 'Test bowl', description: 'Steel bowl', category: 'ACCESSORY', species: ['cat'], price: '100.25', stock: 10, weightGrams: 500, requiresQuote: false, active: false }
    const product = await request('/admin/products', admin.token, 'POST', { ...baseProduct, sellerId: buyer.id }, 201)
    productIds.push(product.id)
    assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).sellerId, admin.id)
    await request(`/products/${product.id}`, null, 'GET', undefined, 404)
    await request(`/admin/products/${product.id}`, admin.token, 'PATCH', { ...baseProduct, active: true, expectedUpdatedAt: product.updatedAt }, 409)
    await prisma.productPhoto.create({ data: { productId: product.id, url: 'http://localhost:5173/leonis-cat.jpg', storageKey: 'store-test-only' } })
    const visible = await request(`/admin/products/${product.id}`, admin.token, 'PATCH', { ...baseProduct, active: true, expectedUpdatedAt: product.updatedAt })
    assert.equal((await request(`/products/${product.id}`)).name, baseProduct.name)
    const items = [{ productId: product.id, quantity: 2, price: 0 }]
    await request('/checkout/preview', buyer.token, 'POST', { items }, 409)
    await request('/admin/settings', admin.token, 'PUT', { standardFee: '250', standardWeightLimitGrams: 2000, checkoutEnabled: true })
    const quote = await request('/checkout/preview', buyer.token, 'POST', { items })
    assert.equal(quote.total, '450.50'); assert.equal(quote.deliveryMode, 'STANDARD')
    const body = { ...address, items, quoteId: quote.quoteId, requestId: randomUUID(), consent: true, total: 0, shippingFee: 0, userId: other.id }
    await request('/orders', buyer.token, 'POST', { ...body, consent: false }, 400)
    const order = await request('/orders', buyer.token, 'POST', body, 201)
    assert.equal(order.userId, buyer.id); assert.equal(order.total, '450.5'); assert.equal(order.status, 'PENDING')
    assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).stock, 8)
    assert.equal((await request('/orders', buyer.token, 'POST', body, 201)).id, order.id)
    assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).stock, 8)
    await request(`/orders/${order.id}`, other.token, 'GET', undefined, 404)
    await request(`/orders/${order.id}/cancel`, other.token, 'POST', {}, 404)
    await request(`/admin/products/${product.id}`, admin.token, 'PATCH', { ...baseProduct, active: true, expectedUpdatedAt: visible.updatedAt }, 409)
    await request(`/orders/${order.id}/cancel`, buyer.token, 'POST', {})
    await request(`/orders/${order.id}/cancel`, buyer.token, 'POST', {})
    assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).stock, 10)
    // A heavy cart requires a separate quote, and admin cannot confirm it early.
    const heavyItems = [{ productId: product.id, quantity: 5 }]
    const heavyQuote = await request('/checkout/preview', buyer.token, 'POST', { items: heavyItems })
    assert.equal(heavyQuote.total, null)
    const heavy = await request('/orders', buyer.token, 'POST', { ...address, items: heavyItems, quoteId: heavyQuote.quoteId, requestId: randomUUID(), consent: true }, 201)
    assert.equal(heavy.status, 'AWAITING_QUOTE')
    await request(`/admin/orders/${heavy.id}/status`, admin.token, 'POST', { status: 'CONFIRMED' }, 409)
    const first = await request(`/admin/orders/${heavy.id}/quote`, admin.token, 'POST', { shippingFee: '500' })
    const second = await request(`/admin/orders/${heavy.id}/quote`, admin.token, 'POST', { shippingFee: '600' })
    await request(`/orders/${heavy.id}/accept`, buyer.token, 'POST', { consent: true, quoteVersion: first.quoteVersion }, 409)
    await request(`/orders/${heavy.id}/accept`, other.token, 'POST', { consent: true, quoteVersion: second.quoteVersion }, 404)
    await request(`/orders/${heavy.id}/accept`, buyer.token, 'POST', { consent: false, quoteVersion: second.quoteVersion }, 409)
    assert.equal((await request(`/orders/${heavy.id}/accept`, buyer.token, 'POST', { consent: true, quoteVersion: second.quoteVersion })).status, 'PENDING')
    await request(`/admin/orders/${heavy.id}/status`, admin.token, 'POST', { status: 'CONFIRMED' })
    await request(`/orders/${heavy.id}/cancel`, buyer.token, 'POST', {}, 409)
    await request(`/admin/orders/${heavy.id}/status`, admin.token, 'POST', { status: 'SHIPPED' })
    await request(`/admin/orders/${heavy.id}/status`, admin.token, 'POST', { status: 'DELIVERED' })
    await request(`/admin/orders/${heavy.id}/status`, admin.token, 'POST', { status: 'CANCELLED' }, 409)
    // Server rejects a reviewed total after a price change.
    const before = await request('/checkout/preview', buyer.token, 'POST', { items: [{ productId: product.id, quantity: 1 }] })
    await prisma.product.update({ where: { id: product.id }, data: { price: '101', stock: 1 } })
    await request('/orders', buyer.token, 'POST', { ...address, items: [{ productId: product.id, quantity: 1 }], quoteId: before.quoteId, requestId: randomUUID(), consent: true }, 409)
    const lastUnit = await request('/checkout/preview', buyer.token, 'POST', { items: [{ productId: product.id, quantity: 1 }] })
    const results = await Promise.all([buyer, other].map(async person => {
      const response = await fetch(api + '/store/orders', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${person.token}` }, body: JSON.stringify({ ...address, items: [{ productId: product.id, quantity: 1 }], quoteId: lastUnit.quoteId, requestId: randomUUID(), consent: true }) })
      return response.status
    }))
    assert.deepEqual(results.sort(), [201, 409]); assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).stock, 0)
    // Concurrent retries reserve only once.
    await prisma.product.update({ where: { id: product.id }, data: { stock: 2 } })
    const retryQuote = await request('/checkout/preview', buyer.token, 'POST', { items: [{ productId: product.id, quantity: 1 }] })
    const retryBody = { ...address, items: [{ productId: product.id, quantity: 1 }], quoteId: retryQuote.quoteId, requestId: randomUUID(), consent: true }
    const retried = await Promise.all([request('/orders', buyer.token, 'POST', retryBody, 201), request('/orders', buyer.token, 'POST', retryBody, 201)])
    assert.equal(retried[0].id, retried[1].id); assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).stock, 1)
    await prisma.user.update({ where: { id: admin.id }, data: { isStoreAdmin: false } })
    await request('/admin/orders', admin.token, 'GET', undefined, 403)
  } finally {
    await prisma.storeOrder.deleteMany({ where: { userId: { in: users.map(user => user.id) } } })
    await prisma.product.deleteMany({ where: { id: { in: productIds } } })
    await prisma.user.deleteMany({ where: { id: { in: users.map(user => user.id) } } })
    if (oldSettings) await prisma.storeSettings.upsert({ where: { id: 1 }, create: oldSettings, update: oldSettings })
    else await prisma.storeSettings.deleteMany({ where: { id: 1 } })
    await prisma.$disconnect()
  }
})
