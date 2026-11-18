import assert from 'node:assert/strict'
import { test } from 'node:test'
import { assess } from '../src/quality/rules.js'

const animal = { id: 1, name: 'Test cow', species: 'dairy-cattle', weights: [], vetVisits: [], meals: [], dairyRecords: [] }
const duplicateCount = records => assess({ ...animal, ...records }, { asOf: '2026-10-20' })
  .filter(finding => finding.ruleId === 'duplicate').length
const meal = (id, name, createdAt) => ({ id, name, createdAt, amount: '100 g' })
const milk = (id, session) => ({ id, kind: 'MILK_YIELD', recordedOn: '2026-10-01', liters: 12, session })

test('meal duplicates cross midnight within fifteen minutes', () => {
  assert.equal(duplicateCount({ meals: [
    meal(1, 'Chicken portion', '2026-10-01T23:59:00Z'),
    meal(2, 'Chikcen portion', '2026-10-02T00:01:00Z'),
  ] }), 1)
})

test('meal matching preserves its time boundary', () => {
  for (const [time, expected] of [['12:15:00', 1], ['12:15:01', 0], ['19:00:00', 0]]) {
    assert.equal(duplicateCount({ meals: [
      meal(1, 'Chicken portion', '2026-10-01T12:00:00Z'),
      meal(2, 'Chicken portion', '2026-10-01T' + time + 'Z'),
    ] }), expected)
  }
})

test('a transposition plus another spelling error exceeds the fuzzy limit', () => {
  assert.equal(duplicateCount({ meals: [
    meal(1, 'Chicken portion', '2026-10-01T12:00:00Z'),
    meal(2, 'Chikcen porton', '2026-10-01T12:00:00Z'),
  ] }), 0)
})

test('different known milking sessions distinguish equal yields', () => {
  assert.equal(duplicateCount({ dairyRecords: [milk(1, 'MORNING'), milk(2, 'EVENING')] }), 0)
  assert.equal(duplicateCount({ dairyRecords: [milk(1, 'MORNING'), milk(2, 'MORNING')] }), 1)
})

test('legacy unknown sessions still trigger possible duplicate review', () => {
  assert.equal(duplicateCount({ dairyRecords: [milk(1), milk(2)] }), 1)
  assert.equal(duplicateCount({ dairyRecords: [milk(1), milk(2, 'MORNING')] }), 1)
})
