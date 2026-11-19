export const categories = {
  MILK_SALE: { income: true, operating: true },
  ANIMAL_SALE: { income: true, operating: false },
  OTHER_INCOME: { income: true, operating: true },
  ANIMAL_PURCHASE: { income: false, operating: false },
  FEED: { income: false, operating: true },
  VET: { income: false, operating: true },
  BREEDING: { income: false, operating: true },
  TRANSPORT: { income: false, operating: true },
  LABOUR: { income: false, operating: true },
  UTILITIES: { income: false, operating: true },
  RENT: { income: false, operating: true },
  MAINTENANCE: { income: false, operating: true },
  EQUIPMENT: { income: false, operating: false },
  OTHER_EXPENSE: { income: false, operating: true },
}
export const fail = (code, status = 400) => { throw Object.assign(new Error(code), { code, status }) }
export const idFrom = value => /^[1-9]\d{0,9}$/.test(String(value)) && Number(value) <= 2147483647 ? Number(value) : fail('NOT_FOUND', 404)
export function requestId(value) {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) fail('INVALID_REQUEST')
  return value
}
export function today() {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date())
  const pick = key => parts.find(part => part.type === key).value
  return `${pick('year')}-${pick('month')}-${pick('day')}`
}
export const dayKey = value => value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10)
export function dateInput(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value < '1900-01-01' || value > today()) fail('INVALID_DATE')
  const date = new Date(value + 'T00:00:00.000Z')
  if (!Number.isFinite(date.getTime()) || dayKey(date) !== value) fail('INVALID_DATE')
  return date
}
export function minor(value, scale = 2) {
  const text = String(value ?? '')
  const max = scale === 2 ? 10 : scale === 4 ? 8 : 7
  if (!new RegExp(`^\\d{1,${max}}(\\.\\d{1,${scale}})?$`).test(text)) fail(scale === 2 ? 'INVALID_AMOUNT' : 'INVALID_QUANTITY')
  const [whole, fraction = ''] = text.split('.')
  return BigInt(whole) * (10n ** BigInt(scale)) + BigInt(fraction.padEnd(scale, '0'))
}
export function decimal(value, scale = 2) {
  const factor = 10n ** BigInt(scale)
  const negative = value < 0n
  const amount = negative ? -value : value
  return `${negative ? '-' : ''}${amount / factor}.${String(amount % factor).padStart(scale, '0')}`
}
export const optionalText = (value, max) => {
  if (value == null || value === '') return null
  if (typeof value !== 'string' || value.trim().length > max) fail('INVALID_FIELDS')
  return value.trim() || null
}
export function barnInput(body) {
  const name = optionalText(body?.name, 100)
  if (!name) fail('INVALID_FIELDS')
  return { name, location: optionalText(body.location, 150), notes: optionalText(body.notes, 2000) }
}
export function entryInput(body, allowDeleted = false) {
  if (!body || !Object.hasOwn(categories, body.category)) fail('INVALID_CATEGORY')
  const amount = minor(body.amount)
  if (amount <= 0n) fail('INVALID_AMOUNT')
  const description = optionalText(body.description, 1000)
  if (!description) fail('INVALID_FIELDS')
  const occurredOn = dateInput(body.occurredOn)
  const petId = body.petId == null || body.petId === '' ? null : idFrom(body.petId)
  if (['ANIMAL_PURCHASE', 'ANIMAL_SALE'].includes(body.category) && petId === null && !(allowDeleted && body.keepDeletedAnimal === true)) fail('ANIMAL_REQUIRED')
  let quantity = null, unit = null
  if (body.category === 'MILK_SALE' || (body.category === 'FEED' && body.quantity != null && body.quantity !== '')) {
    const amount = minor(body.quantity, 3)
    if (amount <= 0n) fail('INVALID_QUANTITY')
    quantity = decimal(amount, 3)
    unit = body.category === 'MILK_SALE' ? 'L' : 'KG'
  }
  return { occurredOn, category: body.category, amount: decimal(amount), quantity, unit, description, petId, receipt: optionalText(body.receipt, 150) }
}
export function paymentInput(body) {
  const amount = minor(body?.amount)
  if (amount <= 0n) fail('INVALID_AMOUNT')
  return { paidOn: dateInput(body.paidOn), amount: decimal(amount), note: optionalText(body.note, 500) }
}
export function entryView(entry) {
  const paid = entry.payments.reduce((sum, item) => sum + minor(item.amount), 0n)
  return { ...entry, paid: decimal(paid), outstanding: decimal(minor(entry.amount) - paid) }
}
