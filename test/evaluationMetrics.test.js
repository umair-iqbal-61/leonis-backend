import assert from 'node:assert/strict'
import { test } from 'node:test'
import { evaluate } from '../benchmark/evaluate.js'

test('evaluation scores true positives, false positives and missed findings', () => {
  const animal = { id: 1, name: '', species: 'cat', meals: [], weights: [], vetVisits: [], dairyRecords: [] }
  const dataset = [
    ['positive', animal, ['profileRequired:profile/1']],
    ['false alarm', animal, []],
    ['miss', { ...animal, name: 'Leo' }, ['profileRequired:profile/1']],
    ['negative', { ...animal, name: 'Leo' }, []],
  ]
  const result = evaluate(true, dataset, '2026-10-20')
  assert.equal(result.overall.tp, 1)
  assert.equal(result.overall.fp, 1)
  assert.equal(result.overall.fn, 1)
  assert.equal(result.overall.precision, 0.5)
  assert.equal(result.overall.recall, 0.5)
  assert.equal(result.overall.f1, 0.5)
  assert.equal(result.overall.falsePositiveRate, 0.5)
  assert.deepEqual(result.perRule.profileRequired, result.overall)
  assert.equal(result.mismatches.length, 2)
})

test('empty evaluation has undefined rates and zero counts', () => {
  const { overall } = evaluate(false, [], '2026-10-20')
  assert.equal(overall.tp, 0)
  assert.equal(overall.precision, null)
  assert.equal(overall.recall, null)
  assert.equal(overall.f1, null)
  assert.equal(overall.falsePositiveRate, null)
})
