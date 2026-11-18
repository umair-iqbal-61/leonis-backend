const day = 86_400_000

export const ruleCatalog = {
  profileRequired: ['completeness', 'high'],
  milkRequired: ['completeness', 'high'],
  weightPositive: ['validity', 'high'],
  ageNonnegative: ['validity', 'high'],
  milkValid: ['validity', 'high'],
  dateValid: ['validity', 'high'],
  visitOrder: ['consistency', 'high'],
  calvingOrder: ['consistency', 'medium'],
  weightChange: ['consistency', 'medium'],
  duplicate: ['uniqueness', 'medium'],
}

function timestamp(value) {
  if (value == null || value === '') return NaN
  const date = new Date(value)
  const time = date.getTime()
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
      Number.isFinite(time) && date.toISOString().slice(0, 10) !== value) return NaN
  return time
}
const median = numbers => {
  const sorted = [...numbers].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

function similar(a, b) {
  if (a === b) return Boolean(a)
  if (Math.min(a.length, b.length) < 5 || Math.abs(a.length - b.length) > 1) return false
  if (a.length > b.length) [a, b] = [b, a]
  let offset = 0
  let differences = 0
  for (let i = 0; i < a.length; i++) {
    if (a[i] === b[i + offset]) continue
    if (++differences > 1) return false
    if (a.length < b.length) {
      offset = 1
      i--
    }
  }
  return true
}

function normalized(value) {
  return String(value ?? '').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
}

export function assess(animal, { asOf, baseline = false }) {
  const findings = []
  const add = (ruleId, records, parameters) => {
    const [dimension, severity] = ruleCatalog[ruleId]
    findings.push({ ruleId, dimension, severity, records, explanationKey: ruleId, parameters })
  }
  const record = (type, item, fields) => ({ type, id: item.id, fields })
  const todayEnd = Math.floor(timestamp(asOf) / day) * day + day
  const validDate = (type, item, field) => {
    const value = item[field]
    if (!Number.isFinite(timestamp(value)) || timestamp(value) >= todayEnd) {
      add('dateValid', [record(type, item, [field])], { field, value: String(value ?? '') })
    }
  }
  const checkWeight = (type, item) => {
    if (!Number.isFinite(Number(item.weight)) || Number(item.weight) <= 0) {
      add('weightPositive', [record(type, item, ['weight'])], { value: String(item.weight ?? '') })
    }
  }
  for (const field of ['name', 'species']) {
    if (!String(animal[field] ?? '').trim()) {
      add('profileRequired', [record('profile', animal, [field])], { field })
    }
  }
  if (animal.weight != null) checkWeight('profile', animal)
  if (animal.age != null && (!Number.isInteger(Number(animal.age)) || Number(animal.age) < 0)) {
    add('ageNonnegative', [record('profile', animal, ['age'])], { value: String(animal.age) })
  }
  for (const item of animal.weights) checkWeight('weight', item)
  for (const item of animal.vetVisits) {
    validDate('vetVisit', item, 'visitDate')
    if (!baseline && timestamp(item.nextVisit) < timestamp(item.visitDate)) {
      add('visitOrder', [record('vetVisit', item, ['visitDate', 'nextVisit'])], {
        visit: new Date(item.visitDate).toISOString().slice(0, 10),
        next: new Date(item.nextVisit).toISOString().slice(0, 10),
      })
    }
  }
  if (animal.species === 'dairy-cattle') {
    for (const item of animal.dairyRecords) {
      validDate('dairy', item, 'recordedOn')
      if (item.kind !== 'MILK_YIELD') continue
      const fields = ['liters']
      if (item.liters == null || item.liters === '') {
        add('milkRequired', [record('dairy', item, fields)], {})
      } else if (!Number.isFinite(Number(item.liters)) || Number(item.liters) < 0 || (item.unit && item.unit !== 'L')) {
        add('milkValid', [record('dairy', item, fields)], { value: String(item.liters), unit: item.unit ?? 'L' })
      }
    }
  }
  if (baseline) return findings

  const weights = animal.weights.filter(item => Number(item.weight) > 0 && Number.isFinite(Number(item.weight)))
    .sort((a, b) => timestamp(a.createdAt) - timestamp(b.createdAt) || a.id - b.id)
  for (let i = 3; i < weights.length; i++) {
    const item = weights[i]
    const previous = weights.slice(Math.max(0, i - 10), i).map(entry => Number(entry.weight))
    const center = median(previous)
    const mad = median(previous.map(value => Math.abs(value - center)))
    if (timestamp(item.createdAt) - timestamp(weights[i - 1].createdAt) > 7 * day) continue
    if (Math.abs(Number(item.weight) - center) > Math.max(center * 0.35, mad * 6)) {
      add('weightChange', [record('weight', item, ['weight'])], { value: String(item.weight), baseline: String(center) })
    }
  }

  const dairy = animal.species === 'dairy-cattle' ? animal.dairyRecords : []
  const breeding = dairy.filter(item => item.kind === 'BREEDING')
  for (const item of dairy.filter(item => item.kind === 'CALVING')) {
    const date = timestamp(item.recordedOn)
    const earlier = breeding.some(entry => timestamp(entry.recordedOn) < date)
    const later = breeding.filter(entry => timestamp(entry.recordedOn) >= date)
      .sort((a, b) => timestamp(a.recordedOn) - timestamp(b.recordedOn) || a.id - b.id)[0]
    if (!earlier && later) {
      add('calvingOrder', [record('dairy', item, ['recordedOn']), record('dairy', later, ['recordedOn'])], {
        calving: new Date(item.recordedOn).toISOString().slice(0, 10),
        breeding: new Date(later.recordedOn).toISOString().slice(0, 10),
      })
    }
  }

  const groups = [
    ['meal', animal.meals, 'createdAt', ['name', 'amount', 'createdAt'], item => normalized(item.name)],
    ['vetVisit', animal.vetVisits, 'visitDate', ['reason', 'vetName', 'visitDate'], item => normalized(item.reason)],
    ['dairy', dairy, 'recordedOn', ['kind', 'recordedOn', 'liters'], item => item.kind],
  ]
  for (const [type, entries, dateField, fields, label] of groups) {
    const sorted = entries.filter(entry => Number.isFinite(timestamp(entry[dateField])))
      .sort((a, b) => timestamp(a[dateField]) - timestamp(b[dateField]) || a.id - b.id)
    for (let i = 0; i < sorted.length; i++) {
      const first = sorted[i]
      for (let j = i + 1; j < sorted.length; j++) {
        const second = sorted[j]
        if (Math.floor(timestamp(first[dateField]) / day) !== Math.floor(timestamp(second[dateField]) / day)) break
        if (!similar(label(first), label(second))) continue
        if (type === 'dairy') {
          const firstVolume = first.liters == null ? null : Number(first.liters)
          const secondVolume = second.liters == null ? null : Number(second.liters)
          if (firstVolume !== secondVolume) continue
        }
        if (type === 'meal' && normalized(first.amount) !== normalized(second.amount)) continue
        if (type === 'vetVisit' && normalized(first.vetName) !== normalized(second.vetName)) continue
        add('duplicate', [record(type, first, fields), record(type, second, fields)], {
          date: new Date(first[dateField]).toISOString().slice(0, 10),
        })
      }
    }
  }
  return findings
}
