import { createHash } from 'node:crypto'
import { listingSpecies, normalizePhone } from '../lib/listings.js'

export const categories = ['FEED', 'ACCESSORY', 'GROOMING', 'CARE', 'OTHER']
export const provinces = ['Punjab', 'Sindh', 'Khyber Pakhtunkhwa', 'Balochistan', 'Islamabad Capital Territory', 'Gilgit-Baltistan', 'Azad Jammu and Kashmir']
export function fail(code, status = 400) { throw Object.assign(new Error(code), { code, status }) }
export function cents(value, allowZero = false) {
  const text = String(value ?? '')
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(text)) return null
  const [whole, fraction = ''] = text.split('.')
  const amount = Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
  return (allowZero ? amount >= 0 : amount > 0) ? amount : null
}
export function money(value) { return `${Math.floor(value / 100)}.${String(value % 100).padStart(2, '0')}` }
export function totalCents(value) {
  const [whole, fraction = ''] = String(value).split('.')
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
}
const text = (value, max) => typeof value === 'string' && value.trim().length > 0 && value.trim().length <= max ? value.trim() : null
export function productInput(body) {
  if (!body || !text(body.name, 120) || !text(body.description, 4000) || !categories.includes(body.category) ||
      !Array.isArray(body.species) || body.species.length > listingSpecies.length || !body.species.every(value => listingSpecies.includes(value)) ||
      cents(body.price) === null || !Number.isInteger(body.stock) || body.stock < 0 || body.stock > 1000000 ||
      !Number.isInteger(body.weightGrams) || body.weightGrams < 1 || body.weightGrams > 1000000 ||
      typeof body.requiresQuote !== 'boolean' || typeof body.active !== 'boolean') fail('INVALID_PRODUCT')
  return { name: body.name.trim(), description: body.description.trim(), category: body.category, species: [...new Set(body.species)],
    price: money(cents(body.price)), stock: body.stock, weightGrams: body.weightGrams, requiresQuote: body.requiresQuote, active: body.active }
}
export function cartInput(items) {
  if (!Array.isArray(items) || !items.length || items.length > 20 || items.some(item =>
    !Number.isInteger(item?.productId) || item.productId < 1 || item.productId > 2147483647 ||
    !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99) ||
    new Set(items.map(item => item.productId)).size !== items.length) fail('INVALID_CART')
  return items.map(({ productId, quantity }) => ({ productId, quantity })).sort((a, b) => a.productId - b.productId)
}
export function addressInput(body) {
  const phone = normalizePhone(body?.phone)
  if (!body || !text(body.recipientName, 100) || !phone || !text(body.address, 500) || !text(body.city, 100) ||
      !provinces.includes(body.province) || (body.postalCode && !/^\d{5}$/.test(body.postalCode))) fail('INVALID_ADDRESS')
  return { recipientName: body.recipientName.trim(), phone, address: body.address.trim(), city: body.city.trim(), province: body.province, postalCode: body.postalCode || null }
}
export function settingsInput(body) {
  if (!body || cents(body.standardFee, true) === null || !Number.isInteger(body.standardWeightLimitGrams) ||
      body.standardWeightLimitGrams < 1 || body.standardWeightLimitGrams > 1000000 || typeof body.checkoutEnabled !== 'boolean') fail('INVALID_SETTINGS')
  return { standardFee: money(cents(body.standardFee, true)), standardWeightLimitGrams: body.standardWeightLimitGrams, checkoutEnabled: body.checkoutEnabled }
}
export function checkoutQuote(products, items, settings) {
  if (!settings?.checkoutEnabled || cents(settings.standardFee, true) === null || !Number.isInteger(settings.standardWeightLimitGrams) || settings.standardWeightLimitGrams < 1) fail('CHECKOUT_CLOSED', 409)
  let subtotal = 0, weightGrams = 0, requiresQuote = false
  const lines = items.map(({ productId, quantity }) => {
    const product = products.find(item => item.id === productId)
    if (!product?.active || product.stock < quantity) fail('STOCK_CHANGED', 409)
    const unitPrice = cents(product.price)
    if (unitPrice === null) fail('INVALID_PRODUCT', 409)
    subtotal += unitPrice * quantity
    weightGrams += product.weightGrams * quantity
    requiresQuote ||= product.requiresQuote
    return { productId, name: product.name, quantity, unitPrice: money(unitPrice), lineTotal: money(unitPrice * quantity), weightGrams: product.weightGrams }
  })
  const deliveryMode = requiresQuote || weightGrams > settings.standardWeightLimitGrams ? 'QUOTE' : 'STANDARD'
  const shippingFee = deliveryMode === 'QUOTE' ? null : money(cents(settings.standardFee, true))
  const total = shippingFee === null ? null : money(subtotal + totalCents(shippingFee))
  const quote = { items: lines, subtotal: money(subtotal), weightGrams, deliveryMode, shippingFee, total }
  return { ...quote, quoteId: createHash('sha256').update(JSON.stringify([quote, String(settings.standardFee), settings.standardWeightLimitGrams])).digest('hex') }
}
export const orderTransitions = {
  PENDING: ['CONFIRMED', 'CANCELLED'], AWAITING_QUOTE: ['CANCELLED'], AWAITING_ACCEPTANCE: ['CANCELLED'],
  CONFIRMED: ['SHIPPED', 'CANCELLED'], SHIPPED: ['DELIVERED'], DELIVERED: [], CANCELLED: [],
}
