import assert from 'node:assert/strict'
import { test } from 'node:test'
import { entryInput, minor, decimal, dateInput, requestId, entryView } from '../src/barn/records.js'
import { summarize, milkSummary, barnReport } from '../src/barn/report.js'

const fails = code => error => error.code === code
const base = { occurredOn: '2025-01-01', category: 'FEED', amount: '100.10', description: 'Recorded feed', petId: null }
test('barn money and quantities use exact integer arithmetic', () => {
  assert.equal(decimal(minor('0.10') + minor('0.20')), '0.30')
  assert.equal(decimal(-25n), '-0.25')
  assert.equal(decimal(minor('9999999999.99') * 10000n), '99999999999900.00')
  assert.equal(decimal(minor('1.025', 3), 3), '1.025')
  for (const value of [null, '', -1, '1e5', '1.001', '10000000000']) assert.throws(() => minor(value), fails('INVALID_AMOUNT'))
})
test('financial dates, milk quantities, categories and animal trades are validated', () => {
  for (const date of ['2025-02-30', '2025-13-01', '2999-01-01', '2025-1-01']) assert.throws(() => dateInput(date), fails('INVALID_DATE'))
  assert.throws(() => entryInput({ ...base, category: '__proto__' }), fails('INVALID_CATEGORY'))
  assert.throws(() => entryInput({ ...base, category: 'ANIMAL_SALE' }), fails('ANIMAL_REQUIRED'))
  assert.throws(() => entryInput({ ...base, category: 'MILK_SALE' }), fails('INVALID_QUANTITY'))
  assert.throws(() => requestId('not-a-uuid'), fails('INVALID_REQUEST'))
  assert.equal(entryInput({ ...base, category: 'MILK_SALE', quantity: '2.5', unit: 'kg' }).unit, 'L')
  assert.equal(entryInput({ ...base, quantity: '10' }).unit, 'KG')
  assert.equal(entryInput(base).quantity, null)
})
const entries = [
  { id: 1, category: 'MILK_SALE', amount: '500.00', quantity: '5', occurredOn: '2025-01-02', animalReference: null, payments: [{ amount: '200', paidOn: '2025-01-03' }, { amount: '300', paidOn: '2025-02-01' }] },
  { id: 2, category: 'FEED', amount: '100', occurredOn: '2025-01-02', animalReference: null, payments: [{ amount: '100', paidOn: '2025-01-04' }] },
  { id: 3, category: 'ANIMAL_PURCHASE', amount: '1000', occurredOn: '2025-01-01', animalReference: 1, animalName: 'Cow', petId: 1, payments: [] },
  { id: 4, category: 'EQUIPMENT', amount: '100', occurredOn: '2025-01-02', animalReference: null, payments: [{ amount: '100', paidOn: '2025-01-04' }] },
]
test('operating results separate capital costs and missing records from zero', () => {
  const report = summarize(entries)
  assert.equal(report.operatingMargin, '400.00')
  assert.equal(report.nonOperatingExpenses, '1100.00')
  assert.equal(summarize([]).operatingIncome, null)
  assert.equal(summarize([entries[0]]).operatingMargin, null)
  assert.equal(entryView(entries[0]).outstanding, '0.00')
})
test('cash reports use settlement dates while balances use the period cutoff', () => {
  const january = barnReport({ id: 1, name: 'A' }, entries, [], [], new Set(), '2025-01-01', '2025-01-31')
  assert.equal(january.cash.receipts, '200.00')
  assert.equal(january.cash.payments, '200.00')
  assert.equal(january.cash.balance, '0.00')
  assert.equal(january.outstanding.receivable, '300.00')
  assert.equal(january.outstanding.payable, '1000.00')
  assert.equal(january.milk.soldLiters, '5.000')
  assert.equal(january.milk.liters, null)
  assert.equal(january.animals[0].operatingIncome, null)
  assert.equal(january.shared.operatingExpenses, '100.00')
  const february = barnReport({ id: 1, name: 'A' }, entries, [], [], new Set(), '2025-02-01', '2025-02-28')
  assert.equal(february.summary.entryCount, 0)
  assert.equal(february.cash.receipts, '300.00')
  assert.equal(february.outstanding.receivable, '0.00')
})
test('dated memberships allocate production once and omit unknown/flagged values', () => {
  const memberships = [{ petId: 1, startedOn: '2025-01-01', endedOn: '2025-01-10' }, { petId: 1, startedOn: '2025-01-20', endedOn: null }]
  const records = [
    { id: 1, petId: 1, recordedOn: '2025-01-09', liters: '10' },
    { id: 2, petId: 1, recordedOn: '2025-01-10', liters: '20' },
    { id: 3, petId: 1, recordedOn: '2025-01-21', liters: null },
    { id: 4, petId: 1, recordedOn: '2025-01-22', liters: '-1' },
    { id: 5, petId: 1, recordedOn: '2025-01-23', liters: '0' },
    { id: 6, petId: 1, recordedOn: '2025-01-24', liters: '12' },
  ]
  const summary = milkSummary(records, memberships, new Set([6]), '2025-01-01', '2025-01-31')
  assert.deepEqual(summary, { liters: '10.0000', recordCount: 2, excludedCount: 3 })
  const otherBarn = milkSummary(records, [{ petId: 1, startedOn: '2025-01-10', endedOn: '2025-01-20' }], new Set(), '2025-01-01', '2025-01-31')
  assert.equal(otherBarn.liters, '20.0000')
})
