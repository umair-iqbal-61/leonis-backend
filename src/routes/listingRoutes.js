import express from 'express'
import multer from 'multer'
import prisma from '../lib/prisma.js'
import cloudinary from '../lib/cloudinary.js'
import validateToken from '../middleware/validateToken.js'
import { listingInput, listingSpecies, publicListing, publicListingSelect } from '../lib/listings.js'

const router = express.Router()
const idFrom = value => /^[1-9]\d{0,9}$/.test(value) && Number(value) <= 2147483647 ? Number(value) : null
const ownerSelect = { ...publicListingSelect, phone: true, whatsapp: true, updatedAt: true }
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 0 } })
const notFound = res => res.status(404).json({ message: 'Listing not found.' })

// Mutations serialize on the listing to keep publish/photo races from exposing a draft.
async function withListing(req, operation) {
  const id = idFrom(req.params.id)
  if (!id) return null
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "Listing" WHERE id = ${id} FOR UPDATE`
    const item = await tx.listing.findFirst({ where: { id, userId: req.user.userId }, include: { photos: true } })
    return item ? operation(tx, item) : null
  })
}

router.get('/', async (req, res) => {
  const { species, location = '', page = '1' } = req.query
  if ((species && !listingSpecies.includes(species)) || typeof location !== 'string' || location.length > 100 ||
      typeof page !== 'string' || !/^[1-9]\d{0,4}$/.test(page)) return res.status(400).json({ message: 'Invalid listing filters.' })
  const where = { status: 'PUBLISHED', ...(species ? { species } : {}),
    ...(location.trim() ? { location: { contains: location.trim(), mode: 'insensitive' } } : {}) }
  const [data, total] = await prisma.$transaction([
    prisma.listing.findMany({ where, select: publicListingSelect, orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }], skip: (Number(page) - 1) * 20, take: 20 }),
    prisma.listing.count({ where }),
  ])
  res.json({ data, total, page: Number(page), pageSize: 20 })
})

router.get('/mine', validateToken, async (req, res) => {
  const data = await prisma.listing.findMany({ where: { userId: req.user.userId }, select: ownerSelect, orderBy: { updatedAt: 'desc' } })
  res.json({ data })
})

router.post('/', validateToken, async (req, res) => {
  const input = listingInput(req.body)
  if (!input) return res.status(400).json({ message: 'Check the listing fields and use a valid phone number with country code (or Pakistani 03 number).' })
  const data = await prisma.listing.create({ data: { ...input, userId: req.user.userId }, select: ownerSelect })
  res.status(201).json({ data })
})

router.get('/mine/:id', validateToken, async (req, res) => {
  const id = idFrom(req.params.id)
  if (!id) return notFound(res)
  const data = await prisma.listing.findFirst({ where: { id, userId: req.user.userId }, select: ownerSelect })
  if (!data) return notFound(res)
  res.json({ data })
})

router.patch('/mine/:id', validateToken, async (req, res) => {
  const input = listingInput(req.body)
  if (!input) return res.status(400).json({ message: 'Check the listing fields and phone numbers.' })
  const data = await withListing(req, (tx, item) => tx.listing.update({ where: { id: item.id }, data: { ...input, status: 'DRAFT', publishedAt: null }, select: ownerSelect }))
  if (!data) return notFound(res)
  res.json({ data })
})

router.post('/mine/:id/publish', validateToken, async (req, res) => {
  if (req.body?.consent !== true) return res.status(400).json({ message: 'Confirm publication of your listing and contact details.' })
  const result = await withListing(req, async (tx, item) => {
    if (!item.photos.length) return { error: 'Add at least one listing photo before publishing.' }
    if (item.status !== 'DRAFT') return { error: 'Only drafts can be published.' }
    return { data: await tx.listing.update({ where: { id: item.id }, data: { status: 'PUBLISHED', publishedAt: new Date() }, select: ownerSelect }) }
  })
  if (!result) return notFound(res)
  if (result.error) return res.status(409).json({ message: result.error })
  res.json(result)
})

router.post('/mine/:id/status', validateToken, async (req, res) => {
  if (!['DRAFT', 'SOLD'].includes(req.body?.status)) return res.status(400).json({ message: 'Invalid listing status.' })
  const result = await withListing(req, async (tx, item) => {
    if (req.body.status === 'SOLD' && item.status !== 'PUBLISHED') return { error: 'Only published listings can be marked sold.' }
    return { data: await tx.listing.update({ where: { id: item.id }, data: { status: req.body.status }, select: ownerSelect }) }
  })
  if (!result) return notFound(res)
  if (result.error) return res.status(409).json({ message: result.error })
  res.json(result)
})

router.post('/mine/:id/photos', validateToken, (req, res, next) => {
  upload.single('photo')(req, res, error => error ? res.status(400).json({ message: 'Upload one JPG, PNG, or WebP image under 5 MB.' }) : next())
}, async (req, res) => {
  const id = idFrom(req.params.id)
  const item = id && await prisma.listing.findFirst({ where: { id, userId: req.user.userId }, include: { _count: { select: { photos: true } } } })
  if (!item) return notFound(res)
  if (item.status !== 'DRAFT') return res.status(409).json({ message: 'Withdraw the listing before changing photos.' })
  if (item._count.photos >= 5) return res.status(409).json({ message: 'A listing can have at most five photos.' })
  const bytes = req.file?.buffer
  const isImage = bytes && (
    (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) ||
    bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ||
    (bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP')
  )
  if (!isImage) return res.status(400).json({ message: 'Upload a JPG, PNG, or WebP image.' })
  const uploaded = await new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream({ folder: 'leonis-listings', resource_type: 'image' }, (error, result) => error ? reject(error) : resolve(result)).end(bytes)
  })
  try {
    const result = await withListing(req, async (tx, current) => {
      if (current.status !== 'DRAFT' || current.photos.length >= 5) return null
      return tx.listingPhoto.create({ data: { listingId: current.id, url: uploaded.secure_url, storageKey: uploaded.public_id }, select: { id: true, url: true } })
    })
    if (!result) {
      await cloudinary.uploader.destroy(uploaded.public_id)
      return res.status(409).json({ message: 'Listing changed or already has five photos.' })
    }
    res.status(201).json({ data: result })
  } catch (error) {
    await cloudinary.uploader.destroy(uploaded.public_id).catch(() => {})
    throw error
  }
})

router.delete('/mine/:id/photos/:photoId', validateToken, async (req, res) => {
  const result = await withListing(req, async (tx, item) => {
    if (item.status !== 'DRAFT') return { error: true }
    const photo = item.photos.find(photo => photo.id === idFrom(req.params.photoId))
    if (!photo) return null
    await tx.listingPhoto.delete({ where: { id: photo.id } })
    return { photo }
  })
  if (!result) return notFound(res)
  if (result.error) return res.status(409).json({ message: 'Withdraw the listing before changing photos.' })
  await cloudinary.uploader.destroy(result.photo.storageKey).catch(() => {})
  res.json({ message: 'Photo removed.' })
})

router.delete('/mine/:id', validateToken, async (req, res) => {
  const result = await withListing(req, async (tx, item) => {
    await tx.listing.delete({ where: { id: item.id } })
    return { photos: item.photos }
  })
  if (!result) return notFound(res)
  await Promise.allSettled(result.photos.map(photo => cloudinary.uploader.destroy(photo.storageKey)))
  res.json({ message: 'Listing removed.' })
})

router.get('/:id', async (req, res) => {
  const id = idFrom(req.params.id)
  if (!id) return notFound(res)
  const item = await prisma.listing.findFirst({ where: { id, status: { in: ['PUBLISHED', 'SOLD'] } }, select: { ...publicListingSelect, phone: true, whatsapp: true } })
  if (!item) return notFound(res)
  res.json({ data: publicListing(item) })
})

export default router
