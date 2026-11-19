import express from 'express'
import multer from 'multer'
import prisma from '../lib/prisma.js'
import cloudinary from '../lib/cloudinary.js'
import validateToken from '../middleware/validateToken.js'
import { listingSpecies } from '../lib/listings.js'
import { categories, productInput, settingsInput, fail } from '../store/commerce.js'
import { preview, placeOrder, orderInclude, changeOrder, cancelOrder, setOrderStatus, quoteDelivery } from '../store/service.js'

const router = express.Router()
const admin = express.Router()
const photos = { select: { id: true, url: true }, orderBy: { id: 'asc' } }
const productSelect = { id: true, name: true, description: true, category: true, species: true, price: true, stock: true,
  weightGrams: true, requiresQuote: true, active: true, updatedAt: true, photos }
const idFrom = value => /^[1-9]\d{0,9}$/.test(value) && Number(value) <= 2147483647 ? Number(value) : fail('NOT_FOUND', 404)
const wrap = fn => async (req, res, next) => {
  try { await fn(req, res) } catch (error) {
    if (error.status) return res.status(error.status).json({ code: error.code, message: error.code })
    next(error)
  }
}
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 0 } })
async function publicSettings() {
  return await prisma.storeSettings.findUnique({ where: { id: 1 } }) ?? { standardFee: null, standardWeightLimitGrams: null, checkoutEnabled: false }
}
router.get('/settings', wrap(async (req, res) => res.json({ data: await publicSettings() })))
router.get('/products', wrap(async (req, res) => {
  const { species, category, page = '1', search = '' } = req.query
  if ((species && !listingSpecies.includes(species)) || (category && !categories.includes(category)) ||
      typeof page !== 'string' || !/^[1-9]\d{0,4}$/.test(page) || typeof search !== 'string' || search.length > 100) fail('INVALID_FILTERS')
  const where = { active: true, ...(category ? { category } : {}),
    ...(species ? { OR: [{ species: { has: species } }, { species: { isEmpty: true } }] } : {}),
    ...(search.trim() ? { name: { contains: search.trim(), mode: 'insensitive' } } : {}) }
  const [data, total] = await prisma.$transaction([
    prisma.product.findMany({ where, select: productSelect, orderBy: { id: 'desc' }, skip: (Number(page) - 1) * 20, take: 20 }),
    prisma.product.count({ where }),
  ])
  res.json({ data, total, page: Number(page), pageSize: 20 })
}))
router.get('/products/:id', wrap(async (req, res) => {
  const data = await prisma.product.findFirst({ where: { id: idFrom(req.params.id), active: true }, select: productSelect })
  if (!data) fail('NOT_FOUND', 404)
  res.json({ data })
}))
router.get('/access', validateToken, wrap(async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.userId }, select: { isStoreAdmin: true } })
  res.json({ data: { isAdmin: user?.isStoreAdmin === true } })
}))

admin.use(validateToken, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.userId }, select: { isStoreAdmin: true } })
    if (!user?.isStoreAdmin) return res.status(403).json({ code: 'ADMIN_REQUIRED', message: 'ADMIN_REQUIRED' })
    next()
  } catch (error) { next(error) }
})

admin.get('/settings', wrap(async (req, res) => res.json({ data: await publicSettings() })))
admin.put('/settings', wrap(async (req, res) => {
  const data = await prisma.storeSettings.upsert({ where: { id: 1 }, create: { id: 1, ...settingsInput(req.body) }, update: settingsInput(req.body) })
  res.json({ data })
}))
admin.get('/products', wrap(async (req, res) => {
  const data = await prisma.product.findMany({ select: productSelect, orderBy: { id: 'desc' } })
  res.json({ data })
}))
admin.get('/products/:id', wrap(async (req, res) => {
  const data = await prisma.product.findUnique({ where: { id: idFrom(req.params.id) }, select: productSelect })
  if (!data) fail('NOT_FOUND', 404)
  res.json({ data })
}))
admin.post('/products', wrap(async (req, res) => {
  const input = productInput(req.body)
  if (input.active) fail('PHOTO_REQUIRED', 409)
  const data = await prisma.product.create({ data: { ...input, sellerId: req.user.userId }, select: productSelect })
  res.status(201).json({ data })
}))
admin.patch('/products/:id', wrap(async (req, res) => {
  const input = productInput(req.body), id = idFrom(req.params.id)
  const data = await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "Product" WHERE id = ${id} FOR UPDATE`
    const old = await tx.product.findUnique({ where: { id }, include: { photos: true } })
    if (!old) fail('NOT_FOUND', 404)
    if (old.updatedAt.toISOString() !== req.body.expectedUpdatedAt) fail('PRODUCT_CHANGED', 409)
    if (input.active && !old.photos.length) fail('PHOTO_REQUIRED', 409)
    return tx.product.update({ where: { id }, data: input, select: productSelect })
  })
  res.json({ data })
}))
admin.post('/products/:id/photos', (req, res, next) => {
  upload.single('photo')(req, res, error => error ? res.status(400).json({ code: 'INVALID_PHOTO', message: 'INVALID_PHOTO' }) : next())
}, wrap(async (req, res) => {
  const id = idFrom(req.params.id)
  const old = await prisma.product.findUnique({ where: { id }, include: { _count: { select: { photos: true } } } })
  if (!old) fail('NOT_FOUND', 404)
  if (old.active || old._count.photos >= 5) fail('PHOTO_STATE', 409)
  const bytes = req.file?.buffer
  if (!bytes || !((bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) ||
      bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ||
      (bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP'))) fail('INVALID_PHOTO')
  const uploaded = await new Promise((resolve, reject) => cloudinary.uploader.upload_stream({ folder: 'leonis-store', resource_type: 'image' },
    (error, result) => error ? reject(error) : resolve(result)).end(bytes))
  try {
    const data = await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "Product" WHERE id = ${id} FOR UPDATE`
      const item = await tx.product.findUnique({ where: { id }, include: { _count: { select: { photos: true } } } })
      if (!item || item.active || item._count.photos >= 5) fail('PHOTO_STATE', 409)
      await tx.productPhoto.create({ data: { productId: id, url: uploaded.secure_url, storageKey: uploaded.public_id } })
      return tx.product.update({ where: { id }, data: { updatedAt: new Date() }, select: productSelect })
    })
    res.status(201).json({ data })
  } catch (error) { await cloudinary.uploader.destroy(uploaded.public_id).catch(() => {}); throw error }
}))
admin.delete('/products/:id/photos/:photoId', wrap(async (req, res) => {
  const id = idFrom(req.params.id), photoId = idFrom(req.params.photoId)
  const result = await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "Product" WHERE id = ${id} FOR UPDATE`
    const item = await tx.product.findUnique({ where: { id } })
    if (!item) fail('NOT_FOUND', 404)
    if (item.active) fail('PHOTO_STATE', 409)
    const photo = await tx.productPhoto.findFirst({ where: { id: photoId, productId: id } })
    if (!photo) fail('NOT_FOUND', 404)
    await tx.productPhoto.delete({ where: { id: photoId } })
    return { data: await tx.product.update({ where: { id }, data: { updatedAt: new Date() }, select: productSelect }), storageKey: photo.storageKey }
  })
  await cloudinary.uploader.destroy(result.storageKey).catch(() => {})
  res.json({ data: result.data })
}))
admin.get('/orders', wrap(async (req, res) => {
  const page = String(req.query.page ?? '1')
  if (!/^[1-9]\d{0,4}$/.test(page)) fail('INVALID_FILTERS')
  const [data, total] = await prisma.$transaction([
    prisma.storeOrder.findMany({ include: orderInclude, orderBy: { id: 'desc' }, take: 30, skip: (Number(page) - 1) * 30 }),
    prisma.storeOrder.count(),
  ])
  res.json({ data, total, page: Number(page), pageSize: 30 })
}))
admin.get('/orders/:id', wrap(async (req, res) => {
  const data = await prisma.storeOrder.findUnique({ where: { id: idFrom(req.params.id) }, include: orderInclude })
  if (!data) fail('NOT_FOUND', 404)
  res.json({ data })
}))
admin.post('/orders/:id/quote', wrap(async (req, res) => {
  const data = await changeOrder(idFrom(req.params.id), req.user.userId, true, (tx, order) => quoteDelivery(tx, order, req.body?.shippingFee))
  res.json({ data })
}))
admin.post('/orders/:id/status', wrap(async (req, res) => {
  const data = await changeOrder(idFrom(req.params.id), req.user.userId, true, (tx, order) => setOrderStatus(tx, order, req.body?.status))
  res.json({ data })
}))
router.use('/admin', admin)
router.use(validateToken)
router.post('/checkout/preview', wrap(async (req, res) => res.json({ data: await preview(prisma, req.body?.items) })))
router.post('/orders', wrap(async (req, res) => res.status(201).json({ data: await placeOrder(req.user.userId, req.body) })))
router.get('/orders', wrap(async (req, res) => {
  const data = await prisma.storeOrder.findMany({ where: { userId: req.user.userId }, include: orderInclude, orderBy: { id: 'desc' } })
  res.json({ data })
}))
router.get('/orders/:id', wrap(async (req, res) => {
  const data = await prisma.storeOrder.findFirst({ where: { id: idFrom(req.params.id), userId: req.user.userId }, include: orderInclude })
  if (!data) fail('NOT_FOUND', 404)
  res.json({ data })
}))
router.post('/orders/:id/accept', wrap(async (req, res) => {
  const data = await changeOrder(idFrom(req.params.id), req.user.userId, false, (tx, order) => {
    if (order.status !== 'AWAITING_ACCEPTANCE' || !Number.isInteger(req.body?.quoteVersion) || req.body.quoteVersion !== order.quoteVersion || req.body.consent !== true) fail('QUOTE_CHANGED', 409)
    return tx.storeOrder.update({ where: { id: order.id }, data: { status: 'PENDING' }, include: orderInclude })
  })
  res.json({ data })
}))
router.post('/orders/:id/cancel', wrap(async (req, res) => {
  const data = await changeOrder(idFrom(req.params.id), req.user.userId, false, (tx, order) => {
    if (!['PENDING', 'AWAITING_QUOTE', 'AWAITING_ACCEPTANCE', 'CANCELLED'].includes(order.status)) fail('INVALID_TRANSITION', 409)
    return cancelOrder(tx, order)
  })
  res.json({ data })
}))
export default router
