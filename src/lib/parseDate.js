export function parseDate(value) {
  if (!value) return undefined

  const isDateOnly = /^\d{4}-\d{1,2}-\d{1,2}$/.test(value)
  const normalized = isDateOnly ? `${value}T00:00:00Z` : value

  const date = new Date(value)
  if (isNaN(date.getTime())) return null
  return date
}