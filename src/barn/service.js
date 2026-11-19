import prisma from '../lib/prisma.js'
import { categories, fail, idFrom, dateInput, requestId, entryInput, paymentInput, minor, dayKey } from './records.js'
import { barnReport } from './report.js'

export const entryInclude = { payments: { orderBy: [{ paidOn: 'desc' }, { id: 'desc' }] } }
export async function ownedBarn(tx, id, userId) {
  const barn = await tx.barn.findFirst({ where: { id, userId } })
  if (!barn) fail('NOT_FOUND', 404)
  return barn
}
export function withBarn(id, userId, operation, readOnly = false) {
  return prisma.$transaction(async tx => {
    if (readOnly) await tx.$queryRaw`SELECT id FROM "Barn" WHERE id = ${id} FOR SHARE`
    else await tx.$queryRaw`SELECT id FROM "Barn" WHERE id = ${id} FOR UPDATE`
    return operation(tx, await ownedBarn(tx, id, userId))
  }, readOnly ? { isolationLevel: 'RepeatableRead' } : {})
}
export async function assignAnimal(barnId, userId, body) {
  const petId = idFrom(body?.petId), startedOn = dateInput(body.startedOn), key = requestId(body.requestId)
  return prisma.$transaction(async tx => {
    // Serialize membership edits per owner; ledger edits do not lock the user row.
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`
    await tx.$queryRaw`SELECT id FROM "Pet" WHERE id = ${petId} FOR UPDATE`
    const pet = await tx.pet.findFirst({ where: { id: petId, userId } })
    if (!pet) fail('NOT_FOUND', 404)
    if (pet.species !== 'dairy-cattle') fail('CATTLE_ONLY')
    await tx.$queryRaw`SELECT id FROM "Barn" WHERE id = ${barnId} FOR UPDATE`
    const barn = await ownedBarn(tx, barnId, userId)
    const previous = await tx.barnMembership.findUnique({ where: { animalReference_requestId: { animalReference: petId, requestId: key } } })
    if (previous) {
      if (previous.barnId !== barnId) fail('REQUEST_REUSED', 409)
      return previous
    }
    if (barn.archived) fail('BARN_ARCHIVED', 409)
    const latest = await tx.barnMembership.findFirst({ where: { petId }, orderBy: [{ startedOn: 'desc' }, { id: 'desc' }] })
    if (latest && startedOn < (latest.endedOn ?? latest.startedOn)) fail('TRANSFER_DATE', 409)
    if (latest && !latest.endedOn) {
      if (latest.barnId === barnId) fail('ALREADY_ASSIGNED', 409)
      await tx.barnMembership.update({ where: { id: latest.id }, data: { endedOn: startedOn } })
    }
    return tx.barnMembership.create({ data: { barnId, petId, animalReference: petId, animalName: pet.name, requestId: key, startedOn } })
  })
}
export async function endMembership(barnId, membershipId, userId, rawDate) {
  const endedOn = dateInput(rawDate)
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`
    await tx.$queryRaw`SELECT id FROM "Barn" WHERE id = ${barnId} FOR UPDATE`
    await ownedBarn(tx, barnId, userId)
    const item = await tx.barnMembership.findFirst({ where: { id: membershipId, barnId } })
    if (!item) fail('NOT_FOUND', 404)
    if (item.endedOn) {
      if (dayKey(item.endedOn) === dayKey(endedOn)) return item
      fail('MEMBERSHIP_CLOSED', 409)
    }
    if (endedOn < item.startedOn) fail('TRANSFER_DATE', 409)
    return tx.barnMembership.update({ where: { id: item.id }, data: { endedOn } })
  })
}
async function financialAnimal(tx, barn, input) {
  if (input.petId == null) return { animalReference: null, animalName: null }
  const animal = await tx.pet.findFirst({ where: { id: input.petId, userId: barn.userId, species: 'dairy-cattle' } })
  const member = animal && await tx.barnMembership.findFirst({ where: { barnId: barn.id, petId: animal.id } })
  if (!member) fail('ANIMAL_NOT_IN_BARN', 409)
  return { animalReference: animal.id, animalName: animal.name }
}
export function saveEntry(barnId, userId, body, entryId = null) {
  const input = entryInput(body, entryId != null)
  return withBarn(barnId, userId, async (tx, barn) => {
    if (!entryId) {
      const key = requestId(body.requestId)
      const previous = await tx.barnEntry.findUnique({ where: { barnId_requestId: { barnId, requestId: key } }, include: entryInclude })
      if (previous) return previous
      if (barn.archived) fail('BARN_ARCHIVED', 409)
      const animal = await financialAnimal(tx, barn, input)
      return tx.barnEntry.create({ data: { ...input, ...animal, barnId, requestId: key }, include: entryInclude })
    }
    const old = await tx.barnEntry.findFirst({ where: { id: entryId, barnId }, include: entryInclude })
    if (!old) fail('NOT_FOUND', 404)
    if (!Number.isInteger(body.expectedVersion) || body.expectedVersion !== old.version) fail('ENTRY_CHANGED', 409)
    const paid = old.payments.reduce((sum, item) => sum + minor(item.amount), 0n)
    if (paid > minor(input.amount)) fail('OVERPAYMENT', 409)
    if (old.payments.length && categories[old.category].income !== categories[input.category].income) fail('PAYMENT_DIRECTION', 409)
    let animal
    if (old.petId === null && old.animalReference != null && input.petId === null && body.keepDeletedAnimal === true) {
      animal = { animalReference: old.animalReference, animalName: old.animalName }
    } else {
      if (['ANIMAL_PURCHASE', 'ANIMAL_SALE'].includes(input.category) && input.petId === null) fail('ANIMAL_REQUIRED')
      animal = await financialAnimal(tx, barn, input)
    }
    return tx.barnEntry.update({ where: { id: entryId }, data: { ...input, ...animal, version: { increment: 1 } }, include: entryInclude })
  })
}
export function addPayment(barnId, entryId, userId, body) {
  const input = paymentInput(body), key = requestId(body.requestId)
  return withBarn(barnId, userId, async tx => {
    const entry = await tx.barnEntry.findFirst({ where: { id: entryId, barnId }, include: entryInclude })
    if (!entry) fail('NOT_FOUND', 404)
    const previous = entry.payments.find(item => item.requestId === key)
    if (previous) return entry
    const paid = entry.payments.reduce((sum, item) => sum + minor(item.amount), 0n)
    if (paid + minor(input.amount) > minor(entry.amount)) fail('OVERPAYMENT', 409)
    await tx.barnPayment.create({ data: { ...input, entryId, requestId: key } })
    return tx.barnEntry.update({ where: { id: entryId }, data: { version: { increment: 1 } }, include: entryInclude })
  })
}
export function getReport(barnId, userId, from, to) {
  return withBarn(barnId, userId, async (tx, barn) => {
    const memberships = await tx.barnMembership.findMany({ where: { barnId }, include: { pet: { select: { name: true } } } })
    const entries = await tx.barnEntry.findMany({ where: { barnId }, include: entryInclude })
    const petIds = [...new Set(memberships.map(item => item.petId).filter(Boolean))]
    const records = await tx.dairyRecord.findMany({ where: { petId: { in: petIds }, pet: { userId }, kind: 'MILK_YIELD', recordedOn: { gte: dateInput(from), lte: dateInput(to) } } })
    const findings = await tx.qualityFinding.findMany({ where: { petId: { in: petIds }, active: true, status: { in: ['OPEN', 'REVIEWED'] } }, select: { records: true } })
    const excluded = new Set(findings.flatMap(finding => finding.records.filter(record => record.type === 'dairy' && record.fields.some(field => ['liters', 'recordedOn', 'kind'].includes(field))).map(record => record.id)))
    return barnReport(barn, entries, memberships, records, excluded, from, to)
  }, true)
}
