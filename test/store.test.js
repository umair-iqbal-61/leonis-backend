import assert from 'node:assert/strict'
import { test } from 'node:test'
import { cents, money, cartInput, checkoutQuote, productInput, addressInput, settingsInput } from '../src/store/commerce.js'
const settings = { checkoutEnabled: true, standardFee: '250.00', standardWeightLimitGrams: 2000 }
const product = { id: 1, name: 'Bowl', price: '100.25', stock: 10, weightGrams: 500, requiresQuote: false, active: true }
const code = expected => error => error.code === expected

test('store monetary calculations use exact minor units and reject malformed prices', () => {
  assert.equal(cents('0.10'), 10); assert.equal(cents('0', true), 0); assert.equal(money(3015), '30.15')
  for (const value of ['', null, -1, '1e3', '1.001', '10000000', true]) assert.equal(cents(value), null)
  assert.equal(cents('0'), null)
})
test('standard delivery includes the configured fee and server-authoritative line prices', () => {
  const items = cartInput([{ productId: 1, quantity: 2, price: 0, total: 0 }])
  const quote = checkoutQuote([product], items, settings)
  assert.equal(quote.subtotal, '200.50'); assert.equal(quote.shippingFee, '250.00'); assert.equal(quote.total, '450.50')
  assert.equal(quote.deliveryMode, 'STANDARD'); assert.equal(quote.weightGrams, 1000)
  assert.equal(checkoutQuote([product], items, { ...settings, standardFee: 0 }).total, '200.50')
})
test('combined cart weight and bulky products require explicit delivery quotes', () => {
  const heavy = checkoutQuote([product], cartInput([{ productId: 1, quantity: 5 }]), settings)
  assert.equal(heavy.deliveryMode, 'QUOTE'); assert.equal(heavy.shippingFee, null); assert.equal(heavy.total, null)
  assert.equal(checkoutQuote([{ ...product, requiresQuote: true }], [{ productId: 1, quantity: 1 }], settings).deliveryMode, 'QUOTE')
  assert.equal(checkoutQuote([product], [{ productId: 1, quantity: 4 }], settings).deliveryMode, 'STANDARD')
})
test('checkout remains closed until real settings are configured and enabled', () => {
  for (const config of [null, { ...settings, checkoutEnabled: false }, { ...settings, standardFee: null }, { ...settings, standardWeightLimitGrams: 0 }]) {
    assert.throws(() => checkoutQuote([product], [{ productId: 1, quantity: 1 }], config), code('CHECKOUT_CLOSED'))
  }
})
test('unavailable stock and malformed carts are rejected', () => {
  for (const items of [[], [{ productId: 1, quantity: 0 }], [{ productId: 1, quantity: 100 }], [{ productId: 1, quantity: 1 }, { productId: 1, quantity: 1 }]]) assert.throws(() => cartInput(items), code('INVALID_CART'))
  for (const candidate of [{ ...product, active: false }, { ...product, stock: 0 }]) assert.throws(() => checkoutQuote([candidate], [{ productId: 1, quantity: 1 }], settings), code('STOCK_CHANGED'))
})
test('the review fingerprint changes when prices, delivery fees or weights change', () => {
  const items = [{ productId: 1, quantity: 1 }], original = checkoutQuote([product], items, settings).quoteId
  assert.notEqual(checkoutQuote([{ ...product, price: '101' }], items, settings).quoteId, original)
  assert.notEqual(checkoutQuote([product], items, { ...settings, standardFee: '251' }).quoteId, original)
  assert.notEqual(checkoutQuote([{ ...product, weightGrams: 600 }], items, settings).quoteId, original)
})
test('product, delivery and Pakistani address validation reject unsafe or incomplete input', () => {
  const input = { ...product, category: 'ACCESSORY', description: 'Steel bowl', species: ['cat'], sellerId: 99 }
  assert.equal(Object.hasOwn(productInput(input), 'sellerId'), false)
  assert.throws(() => productInput({ ...input, weightGrams: 0 }), code('INVALID_PRODUCT'))
  assert.throws(() => settingsInput({ ...settings, standardFee: '' }), code('INVALID_SETTINGS'))
  const address = { recipientName: 'Test owner', phone: '03001234567', address: 'Test street', city: 'Lahore', province: 'Punjab' }
  assert.equal(addressInput(address).phone, '+923001234567')
  assert.throws(() => addressInput({ ...address, province: 'outside Pakistan' }), code('INVALID_ADDRESS'))
  assert.throws(() => addressInput({ ...address, postalCode: '123' }), code('INVALID_ADDRESS'))
})
