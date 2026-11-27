import express from 'express'
import bcrypt from 'bcrypt'
import prisma from '../lib/prisma.js'
import { signupWorkspace } from '../account/workspaces.js'
import { authThrottle } from '../account/authThrottle.js'
import { accountEmail, issueSession, validNewPassword } from '../account/accountCredentials.js'
import { accountEmailEnabled, newVerification, sendAccountMail } from '../account/accountMail.js'
import accountRecoveryRoutes from './accountRecoveryRoutes.js'

const router = express.Router()
router.use(accountRecoveryRoutes)
const signupLimit = Number(process.env.AUTH_SIGNUP_LIMIT ?? 10)
const registerThrottle = authThrottle(Number.isInteger(signupLimit) && signupLimit > 0 && signupLimit <= 100 ? signupLimit : 10, req => req.ip)
const loginThrottle = authThrottle(10, req => {
  const username = typeof req.body?.username === 'string' ? req.body.username.trim().toLowerCase().slice(0, 64) : ''
  return `${req.ip}|${username}`
})

router.post('/register', registerThrottle, async (req, res) => {
  const { username, password, workspace, email } = req.body ?? {}
  const name = typeof username === 'string' ? username.trim() : ''

  if (!/^[\p{L}\p{N}][\p{L}\p{M}\p{N}._-]{2,63}$/u.test(name)) {
    return res.status(400).json({ code: 'INVALID_USERNAME', message: 'Use 3–64 letters, numbers, dots, underscores or hyphens. Start with a letter or number.' })
  }
  if (!validNewPassword(password)) {
    return res.status(400).json({ code: 'INVALID_PASSWORD', message: 'Use at least 15 characters and no more than 72 bytes.' })
  }

  const preferences = signupWorkspace(workspace)
  if (!preferences) return res.status(400).json({ message: 'INVALID_WORKSPACE' })
  const requiresEmailVerification = accountEmailEnabled()
  const address = accountEmail(email)
  if (requiresEmailVerification && !address) {
    return res.status(400).json({ code: 'INVALID_EMAIL', message: 'Enter a valid email address.' })
  }

  try {
    const canonicalName = name.toLowerCase()
    const existing = await prisma.user.findFirst({ where: { username: { equals: canonicalName, mode: 'insensitive' } }, select: { id: true } })
    if (existing) return res.status(409).json({ code: 'USERNAME_TAKEN', message: 'Username already taken.' })
    if (requiresEmailVerification && await prisma.user.findUnique({ where: { email: address }, select: { id: true } })) {
      return res.status(409).json({ code: 'EMAIL_UNAVAILABLE', message: 'That email address cannot be used for this account.' })
    }
    const hashedPassword = await bcrypt.hash(password, 10)
    const verification = requiresEmailVerification ? newVerification(address) : null
    const user = await prisma.user.create({
      data: {
        username: canonicalName,
        password: hashedPassword,
        requiresEmailVerification,
        ...verification?.data,
        ...preferences
      }
    })

    if (verification) {
      const sent = await sendAccountMail(address, verification.token, 'verify')
      return res.status(202).json({ verificationRequired: true, sent })
    }
    res.json({ token: issueSession(user) })

  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ code: 'USERNAME_TAKEN', message: 'Username already taken.' })
    }
    res.status(500).json({ message: 'Something went wrong' })
  }
})

router.post('/login', loginThrottle, async (req, res) => {
  const { username, password } = req.body ?? {}
  const invalid = () => res.status(400).json({ code: 'INVALID_CREDENTIALS', message: 'Invalid username or password.' })

  if (typeof username !== 'string' || !username || typeof password !== 'string' || !password) return invalid()

  try {
    const canonicalName = username.trim().toLowerCase()
    const exact = await prisma.user.findUnique({ where: { username } })
    const user = exact ?? (canonicalName !== username ? await prisma.user.findUnique({ where: { username: canonicalName } }) : null)
    if (!user || !await bcrypt.compare(password, user.password)) return invalid()

    if (user.requiresEmailVerification) {
      return res.status(403).json({ code: 'EMAIL_NOT_VERIFIED', message: 'Verify your email before signing in.' })
    }

    res.json({ token: issueSession(user) })
  } catch (error) {
    res.status(400).json({ message: 'Something went wrong' })
  }
})

export default router
