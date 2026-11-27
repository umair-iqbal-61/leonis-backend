import express from 'express'
import bcrypt from 'bcrypt'
import prisma from '../lib/prisma.js'
import validateToken from '../middleware/validateToken.js'
import { workspaceInput, workspaceSelect } from '../account/workspaces.js'
import { accountEmail, accountToken, accountUsername, clearPasswordReset, clearPendingEmail, issueSession, validNewPassword } from '../account/accountCredentials.js'
import { accountEmailEnabled, newVerification, sendAccountMail, verifyLifetime } from '../account/accountMail.js'
import { authThrottle } from '../account/authThrottle.js'
const router = express.Router()
router.use(validateToken)

const credentialThrottle = authThrottle(8, req => req.user.userId)
const accountSelect = { username: true, email: true, pendingEmail: true, isStoreAdmin: true }
const invalidPassword = res => res.status(400).json({ code: 'INVALID_CREDENTIALS', message: 'That password is incorrect.' })
const emailUnavailable = res => res.status(409).json({ code: 'EMAIL_UNAVAILABLE', message: 'That email address cannot be used for this account.' })
const usernameTaken = res => res.status(409).json({ code: 'USERNAME_TAKEN', message: 'Username already taken.' })
const staleSession = res => res.status(401).json({ code: 'SESSION_EXPIRED', message: 'Sign in again to continue.' })

async function reauthenticate(req, select = {}, password = req.body?.currentPassword) {
  if (typeof password !== 'string' || !password) return null
  const user = await prisma.user.findUnique({
    where: { id: req.user.userId, sessionVersion: req.user.sessionVersion ?? 0 },
    select: { id: true, password: true, sessionVersion: true, ...select },
  })
  return user && await bcrypt.compare(password, user.password) ? user : null
}

router.get('/email', async (req, res) => {
  const data = await prisma.user.findUnique({ where: { id: req.user.userId }, select: accountSelect })
  if (!data) return staleSession(res)
  res.set('Cache-Control', 'no-store').json({ data: { ...data, emailEnabled: accountEmailEnabled() } })
})

router.post('/email', authThrottle(5, req => req.user.userId), async (req, res) => {
  if (!accountEmailEnabled()) return res.status(503).json({ code: 'EMAIL_DISABLED', message: 'Account email is unavailable.' })
  const email = accountEmail(req.body?.email)
  if (!email) return res.status(400).json({ code: 'INVALID_EMAIL', message: 'Enter a valid email address.' })
  const user = await reauthenticate(req, { email: true }, req.body.password)
  if (!user) return invalidPassword(res)
  if (await prisma.user.findUnique({ where: { email }, select: { id: true } })) return emailUnavailable(res)

  const verification = newVerification(email)
  const approval = user.email ? accountToken(verifyLifetime) : null
  const result = await prisma.user.updateMany({ where: { ...user,
    OR: [{ verificationExpiresAt: null }, { verificationExpiresAt: { lte: new Date(Date.now() + verifyLifetime - 60_000) } }] },
    data: { ...verification.data, emailChangeApprovalHash: approval?.hash ?? null } })
  if (!result.count) return res.status(429).json({ code: 'AUTH_RATE_LIMIT', message: 'Wait before requesting another email.' })

  const [sentNew, sentApproval] = await Promise.all([
    sendAccountMail(email, verification.token, 'verify'),
    approval ? sendAccountMail(user.email, approval.token, 'approve-change') : true,
  ])
  res.status(202).json({ pendingEmail: email, sent: sentNew && sentApproval })
})

router.patch('/username', credentialThrottle, async (req, res) => {
  const username = accountUsername(req.body?.username)
  if (!username) return res.status(400).json({ code: 'INVALID_USERNAME', message: 'Enter a valid username.' })
  const user = await reauthenticate(req, { username: true })
  if (!user) return invalidPassword(res)
  if (username === user.username) return res.json({ username })
  const existing = await prisma.user.findFirst({
    where: { username: { equals: username, mode: 'insensitive' }, id: { not: user.id } }, select: { id: true },
  })
  if (existing) return usernameTaken(res)
  try {
    const updated = await prisma.user.updateMany({ where: user, data: { username } })
    if (!updated.count) return staleSession(res)
    res.json({ username })
  } catch (error) {
    if (error.code === 'P2002') return usernameTaken(res)
    throw error
  }
})

router.patch('/password', credentialThrottle, async (req, res) => {
  const password = req.body?.password
  if (!validNewPassword(password)) return res.status(400).json({ code: 'INVALID_PASSWORD', message: 'Use at least 8 characters and no more than 72 bytes.' })
  const user = await reauthenticate(req)
  if (!user) return invalidPassword(res)
  if (await bcrypt.compare(password, user.password)) return res.status(400).json({ code: 'PASSWORD_UNCHANGED', message: 'Choose a different password.' })
  const hash = await bcrypt.hash(password, 10)
  const updated = await prisma.user.updateManyAndReturn({
    where: user,
    data: { password: hash, sessionVersion: { increment: 1 }, ...clearPendingEmail, ...clearPasswordReset },
    select: { id: true, sessionVersion: true },
  })
  if (!updated.length) return staleSession(res)
  res.json({ token: issueSession(updated[0]) })
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
