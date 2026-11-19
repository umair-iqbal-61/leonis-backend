import express from 'express'
import prisma from '../lib/prisma.js'
import validateToken from '../middleware/validateToken.js'
import { workspaceInput, workspaceSelect } from '../account/workspaces.js'
const router = express.Router()
router.use(validateToken)
router.get('/workspaces', async (req, res) => {
  const data = await prisma.user.findUnique({ where: { id: req.user.userId }, select: workspaceSelect })
  if (!data) return res.status(404).json({ message: 'ACCOUNT_UNAVAILABLE' })
  res.json({ data })
})
router.patch('/workspaces', async (req, res) => {
  const result = await prisma.$transaction(async tx => {
    const id = req.user.userId
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${id} FOR UPDATE`
    const current = await tx.user.findUnique({ where: { id }, select: workspaceSelect })
    if (!current) return { status: 404, message: 'ACCOUNT_UNAVAILABLE' }
    const input = workspaceInput(req.body, current)
    if (!input) return { status: 400, message: 'INVALID_WORKSPACE' }
    return { data: await tx.user.update({ where: { id }, data: input, select: workspaceSelect }) }
  })
  if (result.status) return res.status(result.status).json({ message: result.message })
  res.json(result)
})
export default router
