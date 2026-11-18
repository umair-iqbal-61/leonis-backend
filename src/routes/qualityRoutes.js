import { Router } from 'express'
import { qualityReport, qualitySnapshot, withAnimalLock } from '../quality/service.js'

const router = Router()

async function report(req, res) {
  const { animal, findings } = await qualitySnapshot(req.pet.id)
  res.json({ data: qualityReport(animal, findings) })
}

router.get('/quality', report)
router.post('/quality/check', report)

router.patch('/quality/findings/:findingId', async (req, res) => {
  const id = Number(req.params.findingId)
  const { status } = req.body ?? {}
  if (!Number.isSafeInteger(id) || id <= 0 || id > 2147483647 ||
      !['OPEN', 'REVIEWED', 'RESOLVED', 'DISMISSED'].includes(status)) {
    return res.status(400).json({ message: 'Invalid finding or status.' })
  }
  const result = await withAnimalLock(req.pet.id, async tx => {
    const finding = await tx.qualityFinding.findUnique({ where: { id, petId: req.pet.id } })
    if (!finding) return 404
    if (status === 'RESOLVED' && finding.active) return 409
    await tx.qualityFinding.update({
      where: { id },
      data: { status, reviewedAt: status === 'OPEN' ? null : new Date() },
    })
    return 200
  })
  if (result === 404) return res.status(404).json({ message: 'Finding not found.' })
  if (result === 409) return res.status(409).json({ message: 'Correct the affected records before resolving this finding.' })
  res.json({ data: { id, status } })
})

export default router
