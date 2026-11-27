import express from 'express'
import bcrypt from 'bcrypt'
import prisma from '../lib/prisma.js'
import { authThrottle } from '../account/authThrottle.js'
import { accountEmail, accountToken, hashAccountToken, isAccountToken, validNewPassword } from '../account/accountCredentials.js'
import { accountEmailEnabled, newVerification, resetLifetime, sendAccountMail, verifyLifetime } from '../account/accountMail.js'

const router = express.Router()
const mailThrottle = authThrottle(8, req => req.ip)
const tokenThrottle = authThrottle(20, req => req.ip)
const cooldown = 60_000
const accepted = res => res.status(202).json({ accepted: true })
const invalidLink = res => res.status(400).json({ code: 'INVALID_ACCOUNT_LINK', message: 'This link is invalid, expired, or already used.' })

router.get('/options', (req, res) => {
  res.set('Cache-Control', 'no-store').json({ emailEnabled: accountEmailEnabled() })
})

router.post('/resend-verification', mailThrottle, async (req, res) => {
  if (!accountEmailEnabled()) return accepted(res)
  const input = req.body?.username
  if (typeof input !== 'string' || !input.trim() || input.length > 128) return accepted(res)
  const username = input.trim().toLowerCase()
  const user = await prisma.user.findUnique({ where: { username }, select: { id: true, pendingEmail: true } })
  if (!user?.pendingEmail) return accepted(res)
  const verification = newVerification(user.pendingEmail)
  const result = await prisma.user.updateMany({ where: { id: user.id, pendingEmail: user.pendingEmail, emailVerifiedAt: null,
    OR: [{ verificationExpiresAt: null }, { verificationExpiresAt: { lte: new Date(Date.now() + verifyLifetime - cooldown) } }] },
    data: verification.data })
  accepted(res)
  if (result.count) await sendAccountMail(user.pendingEmail, verification.token, 'verify')
})

router.post('/verify-email', tokenThrottle, async (req, res) => {
  const { token, password } = req.body ?? {}
  if (!isAccountToken(token) || typeof password !== 'string' || !password) return invalidLink(res)
  const hash = hashAccountToken(token)
  const user = await prisma.user.findFirst({ where: { verificationTokenHash: hash, verificationExpiresAt: { gt: new Date() } },
    select: { id: true, pendingEmail: true, password: true } })
  if (!user?.pendingEmail) return invalidLink(res)
  if (!await bcrypt.compare(password, user.password)) return res.status(400).json({ code: 'INVALID_CREDENTIALS', message: 'That password is incorrect.' })
  try {
    const result = await prisma.user.updateMany({ where: { id: user.id, verificationTokenHash: hash, pendingEmail: user.pendingEmail,
      password: user.password, verificationExpiresAt: { gt: new Date() }, emailVerifiedAt: null },
    data: { email: user.pendingEmail, emailVerifiedAt: new Date(), pendingEmail: null,
      verificationTokenHash: null, verificationExpiresAt: null, requiresEmailVerification: false } })
    if (!result.count) return invalidLink(res)
    res.json({ verified: true })
  } catch (error) {
    if (error.code === 'P2002') return res.status(409).json({ code: 'EMAIL_UNAVAILABLE', message: 'That email is already linked to another account.' })
    throw error
  }
})

router.post('/forgot-password', mailThrottle, async (req, res) => {
  const email = accountEmail(req.body?.email)
  accepted(res)
  if (!email || !accountEmailEnabled()) return

  try {
    const reset = accountToken(resetLifetime)
    const result = await prisma.user.updateMany({ where: { email, emailVerifiedAt: { not: null },
      OR: [{ passwordResetExpiresAt: null }, { passwordResetExpiresAt: { lte: new Date(Date.now() + resetLifetime - cooldown) } }] },
    data: { passwordResetTokenHash: reset.hash, passwordResetExpiresAt: reset.expiresAt } })
    if (result.count) await sendAccountMail(email, reset.token, 'reset')
  } catch {
    console.warn('Leonis password reset request could not be processed.')
  }
})

router.post('/reset-password', tokenThrottle, async (req, res) => {
  const { token, password } = req.body ?? {}
  if (!isAccountToken(token)) return invalidLink(res)
  if (!validNewPassword(password)) return res.status(400).json({ code: 'INVALID_PASSWORD', message: 'Use at least 15 characters and no more than 72 bytes.' })
  const match = { passwordResetTokenHash: hashAccountToken(token), passwordResetExpiresAt: { gt: new Date() }, emailVerifiedAt: { not: null } }
  if (!await prisma.user.findFirst({ where: match, select: { id: true } })) return invalidLink(res)
  const encrypted = await bcrypt.hash(password, 10)
  const result = await prisma.user.updateMany({ where: { ...match, passwordResetExpiresAt: { gt: new Date() } },
    data: { password: encrypted, passwordResetTokenHash: null, passwordResetExpiresAt: null, sessionVersion: { increment: 1 } } })
  if (!result.count) return invalidLink(res)
  res.json({ reset: true })
})

export default router
