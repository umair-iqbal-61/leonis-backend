import express from 'express'
import prisma from '../lib/prisma.js'
import validateToken from '../middleware/validateToken.js'
import { barnInput, dateInput, dayKey, today, idFrom, requestId, fail, entryView } from '../barn/records.js'
import { withBarn, assignAnimal, endMembership, saveEntry, addPayment, getReport, entryInclude } from '../barn/service.js'

const router = express.Router()
const wrap = fn => async (req, res, next) => {
  try { await fn(req, res) } catch (error) {
    if (error.status) return res.status(error.status).json({ code: error.code, message: error.code })
    next(error)
  }
}
router.use(validateToken)
router.get('/', wrap(async (req, res) => {
  const data = await prisma.barn.findMany({ where: { userId: req.user.userId }, orderBy: [{ archived: 'asc' }, { id: 'desc' }],
    include: { _count: { select: { memberships: { where: { endedOn: null, petId: { not: null } } }, entries: true } } } })
  res.json({ data })
}))
router.post('/', wrap(async (req, res) => {
  const input = barnInput(req.body), key = requestId(req.body.requestId), userId = req.user.userId
  const data = await prisma.barn.upsert({ where: { userId_requestId: { userId, requestId: key } }, create: { ...input, requestId: key, userId }, update: {} })
  res.status(201).json({ data })
}))
router.get('/animals', wrap(async (req, res) => {
  const data = await prisma.pet.findMany({ where: { userId: req.user.userId, species: 'dairy-cattle' }, orderBy: { name: 'asc' },
    select: { id: true, name: true, barnMemberships: { where: { endedOn: null }, select: { barnId: true, startedOn: true, barn: { select: { name: true } } } } } })
  res.json({ data })
}))
router.get('/:id', wrap(async (req, res) => {
  const data = await withBarn(idFrom(req.params.id), req.user.userId, async (tx, barn) => ({ ...barn,
    memberships: await tx.barnMembership.findMany({ where: { barnId: barn.id }, orderBy: [{ startedOn: 'desc' }, { id: 'desc' }],
      include: { pet: { select: { id: true, name: true, avatarUrl: true } } } }),
  }), true)
  res.json({ data })
}))
router.patch('/:id', wrap(async (req, res) => {
  const input = barnInput(req.body)
  if (typeof req.body.archived !== 'boolean') fail('INVALID_FIELDS')
  const data = await withBarn(idFrom(req.params.id), req.user.userId, async (tx, barn) => {
    if (!Number.isInteger(req.body.expectedVersion) || req.body.expectedVersion !== barn.version) fail('BARN_CHANGED', 409)
    if (req.body.archived && await tx.barnMembership.count({ where: { barnId: barn.id, endedOn: null, petId: { not: null } } })) fail('BARN_HAS_ANIMALS', 409)
    return tx.barn.update({ where: { id: barn.id }, data: { ...input, archived: req.body.archived, version: { increment: 1 } } })
  })
  res.json({ data })
}))
router.post('/:id/assignments', wrap(async (req, res) => {
  const data = await assignAnimal(idFrom(req.params.id), req.user.userId, req.body)
  res.status(201).json({ data })
}))
router.post('/:id/memberships/:membershipId/end', wrap(async (req, res) => {
  const data = await endMembership(idFrom(req.params.id), idFrom(req.params.membershipId), req.user.userId, req.body?.endedOn)
  res.json({ data })
}))
router.get('/:id/entries', wrap(async (req, res) => {
  const page = req.query.page ?? '1'
  if (typeof page !== 'string' || !/^[1-9]\d{0,4}$/.test(page)) fail('INVALID_FIELDS')
  const data = await withBarn(idFrom(req.params.id), req.user.userId, async (tx, barn) => {
    const where = { barnId: barn.id, ...(req.query.animalReference ? { animalReference: idFrom(req.query.animalReference) } : {}) }
    const entries = await tx.barnEntry.findMany({ where, include: entryInclude, orderBy: [{ occurredOn: 'desc' }, { id: 'desc' }], take: 20, skip: (Number(page) - 1) * 20 })
    return { entries: entries.map(entryView), total: await tx.barnEntry.count({ where }), page: Number(page), pageSize: 20 }
  }, true)
  res.json({ data })
}))
router.post('/:id/entries', wrap(async (req, res) => {
  const data = await saveEntry(idFrom(req.params.id), req.user.userId, req.body)
  res.status(201).json({ data: entryView(data) })
}))
router.patch('/:id/entries/:entryId', wrap(async (req, res) => {
  const data = await saveEntry(idFrom(req.params.id), req.user.userId, req.body, idFrom(req.params.entryId))
  res.json({ data: entryView(data) })
}))
router.delete('/:id/entries/:entryId', wrap(async (req, res) => {
  const data = await withBarn(idFrom(req.params.id), req.user.userId, async (tx, barn) => {
    const item = await tx.barnEntry.findFirst({ where: { id: idFrom(req.params.entryId), barnId: barn.id }, include: entryInclude })
    if (!item) fail('NOT_FOUND', 404)
    if (item.version !== req.body?.expectedVersion) fail('ENTRY_CHANGED', 409)
    if (item.payments.length) fail('HAS_PAYMENTS', 409)
    await tx.barnEntry.delete({ where: { id: item.id } })
    return { id: item.id }
  })
  res.json({ data })
}))
router.post('/:id/entries/:entryId/payments', wrap(async (req, res) => {
  const data = await addPayment(idFrom(req.params.id), idFrom(req.params.entryId), req.user.userId, req.body)
  res.status(201).json({ data: entryView(data) })
}))
router.delete('/:id/entries/:entryId/payments/:paymentId', wrap(async (req, res) => {
  const data = await withBarn(idFrom(req.params.id), req.user.userId, async (tx, barn) => {
    const entry = await tx.barnEntry.findFirst({ where: { id: idFrom(req.params.entryId), barnId: barn.id }, include: entryInclude })
    if (!entry) fail('NOT_FOUND', 404)
    if (entry.version !== req.body?.expectedVersion) fail('ENTRY_CHANGED', 409)
    const payment = entry.payments.find(item => item.id === idFrom(req.params.paymentId))
    if (!payment) fail('NOT_FOUND', 404)
    await tx.barnPayment.delete({ where: { id: payment.id } })
    return tx.barnEntry.update({ where: { id: entry.id }, data: { version: { increment: 1 } }, include: entryInclude })
  })
  res.json({ data: entryView(data) })
}))
router.get('/:id/report', wrap(async (req, res) => {
  const current = today(), from = dayKey(dateInput(req.query.from ?? current.slice(0, 8) + '01')), to = dayKey(dateInput(req.query.to ?? current))
  if (from > to) fail('INVALID_RANGE')
  res.json({ data: await getReport(idFrom(req.params.id), req.user.userId, from, to) })
}))
export default router
