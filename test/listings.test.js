import assert from 'node:assert/strict'
import { test } from 'node:test'
import { listingInput, normalizePhone, publicListing } from '../src/lib/listings.js'

const valid = { title: 'Dairy cow', description: 'Seller description', species: 'dairy-cattle', breed: '', age: '3', price: '125000.50', location: 'Lahore', phone: '03001234567', whatsapp: '' }

test('listing numbers normalize and WhatsApp defaults to the call number', () => {
  assert.equal(normalizePhone('0300 1234567'), '+923001234567')
  assert.equal(normalizePhone('0092 (300) 1234567'), '+923001234567')
  assert.equal(listingInput(valid).whatsapp, '+923001234567')
  assert.equal(listingInput({ ...valid, whatsapp: '+44 7700 900123' }).whatsapp, '+447700900123')
})

test('listing validation rejects invalid fields, contact URLs, and unsupported species', () => {
  for (const changes of [
    { title: ' ' }, { description: '' }, { species: 'unknown' }, { location: [] },
    { age: -1 }, { age: 1.5 }, { price: 0 }, { price: '-1' }, { price: '1e5' },
    { price: '10000000000' }, { price: '1.001' }, { phone: 'javascript:alert(1)' },
    { phone: '12345' }, { whatsapp: 'https://example.com' }, { breed: {} },
  ]) assert.equal(listingInput({ ...valid, ...changes }), null, JSON.stringify(changes))
})

test('listing input ignores client attempts to assign ownership, status, source records, or photos', () => {
  const input = listingInput({ ...valid, userId: 99, status: 'PUBLISHED', petId: 1, photos: ['private-url'] })
  for (const field of ['userId', 'status', 'petId', 'photos']) assert.equal(Object.hasOwn(input, field), false)
  assert.equal(listingInput({ ...valid, age: '0' }).age, 0)
})

test('public listing fields exclude private metadata and sold listings hide contacts', () => {
  const listing = { id: 1, title: 'Dairy cow', status: 'PUBLISHED', phone: '+923001234567', whatsapp: '+923007654321', userId: 1,
    user: { password: 'private' }, pets: [{ notes: 'private' }], photos: [{ id: 1, url: 'https://example.com/animal.jpg', storageKey: 'private-key' }] }
  const published = publicListing(listing)
  assert.equal(published.phone, listing.phone)
  assert.equal(published.whatsapp, listing.whatsapp)
  for (const field of ['userId', 'user', 'pets']) assert.equal(Object.hasOwn(published, field), false)
  assert.deepEqual(published.photos, [{ id: 1, url: 'https://example.com/animal.jpg' }])
  const sold = publicListing({ ...listing, status: 'SOLD' })
  assert.equal(Object.hasOwn(sold, 'phone'), false)
  assert.equal(Object.hasOwn(sold, 'whatsapp'), false)
})
