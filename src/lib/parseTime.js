export function parseTime(value) {
  if (!value) return undefined

  const isTimeOnly = /^\d{1,2}:\d{2}$/.test(value)
  const normalized = isTimeOnly ? `2026-06-01T${value}:00Z` : value

  const date = new Date(normalized)
  if (isNaN(date.getTime())) return null
  return date
}