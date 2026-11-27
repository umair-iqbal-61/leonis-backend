import express from 'express'
import bcrypt from 'bcrypt'
import prisma from '../lib/prisma.js'
import validateToken from '../middleware/validateToken.js'
import { workspaceInput, workspaceSelect } from '../account/workspaces.js'
import { accountEmail } from '../account/accountCredentials.js'
import { accountEmailEnabled, newVerification, sendAccountMail, verifyLifetime } from '../account/accountMail.js'
import { authThrottle } from '../account/authThrottle.js'
const router = express.Router()
router.use(validateToken)

router.get('/email', async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.userId }, select: { email: true, pendingEmail: true } })
  res.set('Cache-Control', 'no-store').json({ data: { ...user, emailEnabled: accountEmailEnabled() } })
})

router.post('/email', authThrottle(5, req => req.user.userId), async (req, res) => {
  if (!accountEmailEnabled()) return res.status(503).json({ code: 'EMAIL_DISABLED', message: 'Account email is unavailable.' })
  const email = accountEmail(req.body?.email)
  if (!email) return res.status(400).json({ code: 'INVALID_EMAIL', message: 'Enter a valid email address.' })
  const user = await prisma.user.findUnique({ where: { id: req.user.userId }, select: { password: true, emailVerifiedAt: true } })
  const password = req.body?.password
  if (!user || typeof password !== 'string' || !password || !await bcrypt.compare(password, user.password)) {
    return res.status(400).json({ code: 'INVALID_CREDENTIALS', message: 'That password is incorrect.' })
  }
  if (user.emailVerifiedAt || await prisma.user.findUnique({ where: { email }, select: { id: true } })) {
    return res.status(409).json({ code: 'EMAIL_UNAVAILABLE', message: 'That email address cannot be used for this account.' })
  }
  const verification = newVerification(email)
  const result = await prisma.user.updateMany({ where: { id: req.user.userId, password: user.password, emailVerifiedAt: null,
    OR: [{ verificationExpiresAt: null }, { verificationExpiresAt: { lte: new Date(Date.now() + verifyLifetime - 60_000) } }] },
    data: verification.data })
  if (!result.count) return res.status(429).json({ code: 'AUTH_RATE_LIMIT', message: 'Wait before requesting another email.' })
  const sent = await sendAccountMail(email, verification.token, 'verify')
  res.status(202).json({ pendingEmail: email, sent })
})
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
