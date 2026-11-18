import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { changeAnimal } from '../quality/service.js'

const router = Router()
const kinds = ['MILK_YIELD', 'BREEDING', 'CALVING']

function dairyData(body) {
  const { kind, recordedOn, liters, notes, session } = body ?? {}
  if (!kinds.includes(kind) || typeof recordedOn !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(recordedOn)) return null
  const date = new Date(recordedOn)
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== recordedOn) return null
  if (notes != null && (typeof notes !== 'string' || notes.length > 2000)) return null
  if (session != null && session !== '' && !['MORNING', 'AFTERNOON', 'EVENING'].includes(session)) return null
  let volume = null
  if (kind === 'MILK_YIELD' && liters != null && liters !== '') {
    if (!['string', 'number'].includes(typeof liters) || !/^-?\d{1,8}(?:\.\d{1,4})?$/.test(String(liters))) return null
    volume = String(liters)
  }
  const data = { kind, recordedOn: date, liters: volume, notes: notes?.trim() || null }
  if (kind !== 'MILK_YIELD') data.session = null
  else if (session !== undefined) data.session = session || null
  return data
}

router.use('/dairy', (req, res, next) => {
  if (req.pet.species !== 'dairy-cattle') return res.status(404).json({ message: 'Dairy records require a dairy cattle profile.' })
  next()
})

router.get('/dairy', async (req, res) => {
  const data = await prisma.dairyRecord.findMany({
    where: { petId: req.pet.id }, orderBy: [{ recordedOn: 'desc' }, { id: 'desc' }],
  })
  res.json({ data })
})

async function write(req, res) {
  const { recordId } = req.params
  const id = Number(recordId)
  if (recordId !== undefined && (!Number.isSafeInteger(id) || id <= 0 || id > 2147483647)) {
    return res.status(404).json({ message: 'Dairy record not found.' })
  }
  const deleting = req.method === 'DELETE'
  const values = deleting ? null : dairyData(req.body)
  if (!deleting && !values) return res.status(400).json({ message: 'Enter a valid record type, date, and volume in liters.' })

  const petId = req.pet.id
  try {
    const data = await changeAnimal(petId, async tx => {
      await tx.pet.findUniqueOrThrow({ where: { id: petId, species: 'dairy-cattle' } })
      if (req.method === 'POST') return tx.dairyRecord.create({ data: { ...values, petId } })
      const where = { id, petId }
      if (deleting) return tx.dairyRecord.delete({ where })
      return tx.dairyRecord.update({ where, data: values })
    })
    res.status(req.method === 'POST' ? 201 : 200).json({ data })
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ message: 'Dairy record not found.' })
    throw error
  }
}

router.post('/dairy', write)
router.put('/dairy/:recordId', write)
router.delete('/dairy/:recordId', write)

export default router
