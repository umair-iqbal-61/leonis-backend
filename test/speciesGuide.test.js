import assert from 'node:assert/strict'
import { test } from 'node:test'
import { assessRecordExpectations, assessRecordQuality, speciesGuide, expectationSources } from '../src/quality/speciesGuide.js'

const animal = { id: 1, name: 'Leo', species: 'cat', meals: [], weights: [], vetVisits: [], dairyRecords: [] }
const visit = { id: 2, visitDate: '2026-10-01', reason: 'Checkup' }
const calving = { id: 3, kind: 'CALVING', recordedOn: '2026-10-01' }

test('empty profiles do not imply missing care or reproductive records', () => {
  for (const species of ['dog', 'cat', 'dairy-cattle', 'bird', 'fish', 'rabbit', 'other']) {
    assert.deepEqual(assessRecordExpectations({ ...animal, species }), [])
  }
})

test('a pet visit prompts review of absent weight information', () => {
  for (const species of ['cat', 'dog']) {
    const pet = { ...animal, species, vetVisits: [visit] }
    assert.equal(assessRecordExpectations(pet)[0].ruleId, 'weightHistoryMissing')
    assert.deepEqual(assessRecordExpectations({ ...pet, weight: 0 }), [])
    assert.deepEqual(assessRecordExpectations({ ...pet, weights: [{ id: 5, weight: 4 }] }), [])
    assert.deepEqual(assessRecordExpectations({ ...pet, weight: 4 }), [])
  }
})

test('invalid weights are handled by validity rules instead of treated as absent', () => {
  const findings = assessRecordQuality({ ...animal, vetVisits: [visit], weight: 0 }, { asOf: '2026-10-20' })
  assert.deepEqual(findings.map(item => item.ruleId), ['weightPositive'])
})

test('calving without any breeding history prompts review only for cattle', () => {
  const cattle = { ...animal, species: 'dairy-cattle', dairyRecords: [calving] }
  assert.equal(assessRecordExpectations(cattle)[0].ruleId, 'breedingHistoryMissing')
  assert.deepEqual(assessRecordExpectations({ ...animal, dairyRecords: [calving] }), [])
  assert.deepEqual(assessRecordExpectations({
    ...cattle, dairyRecords: [calving, { id: 4, kind: 'BREEDING', recordedOn: '2026-01-01' }],
  }), [])
  assert.deepEqual(assessRecordExpectations({
    ...cattle, dairyRecords: [calving, { id: 4, kind: 'BREEDING', recordedOn: '2026-11-01' }],
  }), [])
})

test('expectations have HTTPS citations and deterministic record references', () => {
  const cattle = { ...animal, species: 'dairy-cattle', dairyRecords: [{ ...calving, id: 8 }, calving] }
  const findings = assessRecordExpectations(cattle)
  assert.deepEqual(findings, assessRecordExpectations({ ...cattle, dairyRecords: [...cattle.dairyRecords].reverse() }))
  assert.ok(expectationSources[findings[0].ruleId].url.startsWith('https://'))
})

test('guide includes general species guidance and normalizes known breeds', () => {
  assert.equal(speciesGuide(animal)[0].id, 'companion-records')
  assert.equal(speciesGuide({ ...animal, breed: ' MAINE   COON ' }).length, 2)
  assert.equal(speciesGuide({ ...animal, species: 'dairy-cattle', breed: 'Holstein-Friesian' }).length, 2)
  assert.deepEqual(speciesGuide({ ...animal, species: 'bird' }), [])
})
