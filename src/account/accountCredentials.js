import { createHash, randomBytes } from 'node:crypto'
import jwt from 'jsonwebtoken'

export function accountEmail(value) {
  if (typeof value !== 'string') return null
  const email = value.trim().toLowerCase()
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null
}

export function validNewPassword(password) {
  return typeof password === 'string' && [...password].length >= 15 && Boolean(password.trim()) && Buffer.byteLength(password, 'utf8') <= 72
}

export const hashAccountToken = token => createHash('sha256').update(token).digest('hex')
export const isAccountToken = token => typeof token === 'string' && /^[\da-f]{64}$/.test(token)

export function accountToken(lifetime) {
  const token = randomBytes(32).toString('hex')
  return { token, hash: hashAccountToken(token), expiresAt: new Date(Date.now() + lifetime) }
}

export function issueSession(user) {
  return jwt.sign({ userId: user.id, sessionVersion: user.sessionVersion }, process.env.JWT_SECRET, { expiresIn: '24h' })
}
