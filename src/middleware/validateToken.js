import jwt from 'jsonwebtoken'
import prisma from '../lib/prisma.js'

async function validateToken(req, res, next) {
  if (req.user) return next()
  const authHeader = req.headers['authorization']
  const token = authHeader?.match(/^Bearer (\S+)$/i)?.[1]

  if (!token) {
    return res.status(400).json({ message: "Invalid or expired token" })
  }

  const expired = () => res.status(401).json({ code: 'SESSION_EXPIRED', message: 'Your session ended. Please sign in again.' })
  let decoded
  try { decoded = jwt.verify(token, process.env.JWT_SECRET) } catch { return expired() }
  if (!Number.isSafeInteger(decoded?.userId)) return expired()
  const user = await prisma.user.findUnique({ where: { id: decoded.userId }, select: { sessionVersion: true, requiresEmailVerification: true } })
  if (!user || user.requiresEmailVerification || user.sessionVersion !== (decoded.sessionVersion ?? 0)) return expired()

  req.user = decoded
  next()
}

export default validateToken
