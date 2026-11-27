import { accountToken } from './accountCredentials.js'

export const verifyLifetime = 24 * 60 * 60 * 1000
export const resetLifetime = 30 * 60 * 1000

function settings() {
  const key = process.env.RESEND_API_KEY?.trim()
  const from = process.env.ACCOUNT_EMAIL_FROM?.trim()
  if (!key || !from || !process.env.ACCOUNT_EMAIL_ORIGIN) return null
  try {
    const url = new URL(process.env.ACCOUNT_EMAIL_ORIGIN)
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))) return null
    return { key, from, origin: url.origin }
  } catch {
    return null
  }
}

export const accountEmailEnabled = () => Boolean(settings())

export function newVerification(email) {
  const { token, hash, expiresAt } = accountToken(verifyLifetime)
  return { token, data: { pendingEmail: email, verificationTokenHash: hash, verificationExpiresAt: expiresAt } }
}

export async function sendAccountMail(to, token, purpose) {
  const config = settings()
  if (!config) return false
  const verify = purpose === 'verify'
  const subject = verify ? 'Verify your Leonis email' : 'Reset your Leonis password'
  const link = new URL(verify ? '/verify-email' : '/reset-password', config.origin)
  link.hash = new URLSearchParams({ token }).toString()
  const duration = verify ? '24 hours' : '30 minutes'
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: config.from, to: [to], subject,
        text: `${subject}\n\nOpen this link to continue: ${link}\n\nIt expires in ${duration}. If you did not request this, you can ignore this email.` }),
      signal: AbortSignal.timeout(5000),
    })
    if (response.ok) return true
  } catch {
    // Keep recipient addresses, links, and credentials out of operational logs.
  }
  console.warn('Leonis account email delivery failed.')
  return false
}
