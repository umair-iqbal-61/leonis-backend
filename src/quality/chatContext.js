const fieldsByType = {
  profile: ['id', 'name', 'species', 'breed', 'age', 'weight', 'gender'],
  meal: ['id', 'name', 'amount', 'createdAt'],
  weight: ['id', 'weight', 'createdAt'],
  vetVisit: ['id', 'reason', 'vetName', 'visitDate', 'nextVisit'],
  dairy: ['id', 'kind', 'recordedOn', 'liters', 'session'],
}

export function chatContext(animal, findings) {
  const excluded = new Map()
  for (const { active, status, records } of findings) {
    if (!active || status === 'DISMISSED' || status === 'RESOLVED') continue
    for (const { type, id, fields } of records) {
      const key = `${type}:${id}`
      excluded.set(key, new Set([...(excluded.get(key) ?? []), ...fields]))
    }
  }
  const pick = (type, item) => Object.fromEntries(fieldsByType[type]
    .filter(field => item[field] != null && !excluded.get(`${type}:${item.id}`)?.has(field))
    .map(field => [field, item[field]]))
  const recent = (type, items, date, limit) => [...items]
    .sort((a, b) => new Date(b[date]) - new Date(a[date]) || b.id - a.id)
    .slice(0, limit).map(item => pick(type, item))

  return {
    profile: pick('profile', animal),
    meals: recent('meal', animal.meals, 'createdAt', 5),
    weights: recent('weight', animal.weights, 'createdAt', 5),
    vetVisits: recent('vetVisit', animal.vetVisits, 'visitDate', 5),
    dairyRecords: animal.species === 'dairy-cattle' ? recent('dairy', animal.dairyRecords, 'recordedOn', 10) : [],
    uncertainFields: Object.fromEntries([...excluded].map(([key, fields]) => [key, [...fields]])),
  }
}
