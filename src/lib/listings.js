export const listingSpecies = ['dog', 'cat', 'bird', 'fish', 'rabbit', 'dairy-cattle', 'other']

export function normalizePhone(value) {
  if (typeof value !== 'string' || value.length > 40 || !/^[+\d\s()-]+$/.test(value)) return null
  let phone = value.replace(/[\s()-]/g, '')
  if (/^03\d{9}$/.test(phone)) phone = '+92' + phone.slice(1)
  if (/^00\d+$/.test(phone)) phone = '+' + phone.slice(2)
  return /^\+[1-9]\d{6,14}$/.test(phone) ? phone : null
}

export function listingInput(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null
  const text = (key, max, required = false) => {
    if (!required && (body[key] == null || body[key] === '')) return null
    return typeof body[key] === 'string' && body[key].trim().length > 0 && body[key].trim().length <= max
      ? body[key].trim() : undefined
  }
  const title = text('title', 100, true)
  const description = text('description', 3000, true)
  const location = text('location', 100, true)
  const breed = text('breed', 100)
  const priceText = typeof body.price === 'number' || typeof body.price === 'string' ? String(body.price) : ''
  const ageText = body.age == null || body.age === '' ? null : String(body.age)
  const phone = normalizePhone(body.phone)
  const whatsapp = body.whatsapp == null || body.whatsapp === '' ? phone : normalizePhone(body.whatsapp)
  if (!title || !description || !location || breed === undefined || !listingSpecies.includes(body.species) ||
      !/^\d{1,10}(\.\d{1,2})?$/.test(priceText) || Number(priceText) <= 0 ||
      (ageText !== null && (!/^\d{1,3}$/.test(ageText) || Number(ageText) > 200)) || !phone || !whatsapp) return null
  return { title, description, species: body.species, breed, age: ageText === null ? null : Number(ageText),
    price: priceText, location, phone, whatsapp }
}

// Public views deliberately select listing data, never linked care records or account data.
export const publicListingSelect = {
  id: true, title: true, description: true, species: true, breed: true, age: true,
  price: true, location: true, status: true, publishedAt: true,
  photos: { select: { id: true, url: true }, orderBy: { id: 'asc' } },
}

export function publicListing(item) {
  const result = Object.fromEntries(Object.keys(publicListingSelect).map(key => [key, item[key]]))
  result.photos = item.photos.map(({ id, url }) => ({ id, url }))
  if (item.status === 'PUBLISHED') {
    result.phone = item.phone
    result.whatsapp = item.whatsapp
  }
  return result
}
