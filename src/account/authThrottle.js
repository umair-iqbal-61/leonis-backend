const WINDOW_MS = 15 * 60 * 1000
const CAPACITY = 10_000

export function authThrottle(limit, keyFor) {
  const buckets = new Map()
  let nextSweep = 0

  return (req, res, next) => {
    const now = Date.now()
    if (now >= nextSweep) {
      for (const [key, bucket] of buckets) if (bucket.until <= now) buckets.delete(key)
      nextSweep = now + 60_000
    }

    const key = keyFor(req)
    let bucket = buckets.get(key)
    if (bucket && bucket.until <= now) { buckets.delete(key); bucket = undefined }
    if (bucket?.count >= limit || (!bucket && buckets.size >= CAPACITY)) {
      res.set('Retry-After', String(Math.ceil(((bucket?.until ?? nextSweep) - now) / 1000)))
      return res.status(429).json({ code: 'AUTH_RATE_LIMIT', message: 'Too many attempts. Please try again later.' })
    }

    if (bucket) bucket.count++
    else buckets.set(key, { count: 1, until: now + WINDOW_MS })
    next()
  }
}
