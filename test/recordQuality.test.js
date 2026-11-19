import assert from 'node:assert/strict'
import { test } from 'node:test'
import { assess } from '../src/quality/rules.js'
import { cases } from '../benchmark/fixtures.js'
import { asOf, evaluate, findingKey } from '../benchmark/evaluate.js'

for (const [label, animal, expected] of cases) {
  test(label, () => {
    const findings = assess(animal, { asOf })
    assert.deepEqual(findings.map(findingKey).sort(), [...expected].sort())
    assert.deepEqual(assess(structuredClone(animal), { asOf }), findings)
  })
}

test('cross-record checks detect findings beyond the validation baseline', () => {
  assert.ok(evaluate(false).overall.recall > evaluate(true).overall.recall)
})

test('chat excludes flagged values while keeping unrelated fields and owner dismissals', async () => {
  const { chatContext } = await import('../src/quality/chatContext.js')
  const [, animal] = cases.find(([name]) => name === 'suspect abrupt weight change')
  const [finding] = assess(animal, { asOf })
  const reviewed = chatContext(animal, [{ ...finding, status: 'REVIEWED', active: true }])
  assert.equal(reviewed.weights[0].weight, undefined)
  assert.equal(reviewed.weights[0].createdAt, '2026-06-04')
  assert.equal(reviewed.weights[1].weight, 4.2)
  assert.deepEqual(reviewed.uncertainFields, { 'weight:4': ['weight'] })
  assert.equal(chatContext(animal, [{ ...finding, status: 'DISMISSED', active: true }]).weights[0].weight, 42)
})

test('chat omits dairy categories for pets and retains cattle records with review filtering', async () => {
  const { chatContext } = await import('../src/quality/chatContext.js')
  const [, cleanAnimal] = cases.find(([name]) => name === 'clean cat')
  const animal = {
    ...cleanAnimal,
    dairyRecords: [{ id: 91, kind: 'MILK_YIELD', recordedOn: '2026-06-01', liters: 12 }],
  }
  const findings = [{
    active: true, status: 'OPEN',
    records: [{ type: 'dairy', id: 91, fields: ['liters'] }],
  }]
  for (const species of ['cat', 'dog']) {
    const context = chatContext({ ...animal, species }, findings)
    assert.equal(Object.hasOwn(context, 'dairyRecords'), false)
    assert.deepEqual(context.uncertainFields, {})
    assert.equal(context.profile.species, species)
  }
  const cattle = chatContext({ ...animal, species: 'dairy-cattle' }, findings)
  assert.equal(cattle.dairyRecords[0].id, 91)
  assert.equal(cattle.dairyRecords[0].liters, undefined)
  assert.deepEqual(cattle.uncertainFields, { 'dairy:91': ['liters'] })
  assert.deepEqual(chatContext({ ...animal, species: 'dairy-cattle', dairyRecords: [] }, []).dairyRecords, [])
})
