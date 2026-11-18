// Labels describe the intended review outcome, written explicitly before running
// this set. This is author-labeled synthetic evaluation, without external review.
export const evaluationDate = '2026-10-20'

const animal = { id: 100, name: 'Evaluation animal', species: 'dog', meals: [], weights: [], vetVisits: [], dairyRecords: [] }
const cow = { ...animal, species: 'dairy-cattle' }
const meal = (id, name, date, amount = '100 g') => ({ id, name, amount, createdAt: date })
const visit = (id, reason, visitDate, nextVisit) => ({ id, reason, visitDate, nextVisit, vetName: 'Evaluation clinic' })
const dairy = (id, kind, recordedOn, liters) => ({ id, kind, recordedOn, liters })
const weights = values => values.map((weight, i) => ({ id: i + 1, weight, createdAt: `2026-10-${10 + i}T09:00:00Z` }))

export const evaluationCases = [
  ['adult dog with no optional records', animal, []],
  ['cat with a large stable weight', { ...animal, species: 'cat', weights: weights([10, 10.1, 10, 10.2]) }, []],
  ['cattle with a stable baseline', { ...cow, weights: weights([520, 524, 521, 525]) }, []],
  ['blank species', { ...animal, species: ' ' }, ['profileRequired:profile/100']],
  ['negative saved profile weight', { ...animal, weight: -12 }, ['weightPositive:profile/100']],
  ['negative cattle weight entry', { ...cow, weights: [{ id: 5, weight: -300 }] }, ['weightPositive:weight/5']],
  ['missing historical visit date', { ...animal, vetVisits: [visit(9, 'Check', null)] }, ['dateValid:vetVisit/9']],
  ['future cattle milk entry', { ...cow, dairyRecords: [dairy(8, 'MILK_YIELD', '2026-11-01', 21)] }, ['dateValid:dairy/8']],
  ['cattle visit follow-up reversed', { ...cow, vetVisits: [visit(7, 'Check', '2026-10-01', '2026-09-29')] }, ['visitOrder:vetVisit/7']],
  ['future follow-up is allowed', { ...animal, vetVisits: [visit(7, 'Check', '2026-10-01', '2026-12-01')] }, []],
  ['cattle missing measured volume', { ...cow, dairyRecords: [dairy(3, 'MILK_YIELD', '2026-10-02', null)] }, ['milkRequired:dairy/3']],
  ['cattle negative volume', { ...cow, dairyRecords: [dairy(3, 'MILK_YIELD', '2026-10-02', -9)] }, ['milkValid:dairy/3']],
  ['calving before sole breeding record', { ...cow, dairyRecords: [
    dairy(6, 'CALVING', '2026-09-01'), dairy(7, 'BREEDING', '2026-10-01'),
  ] }, ['calvingOrder:dairy/6,dairy/7']],
  ['breeding before calving', { ...cow, dairyRecords: [
    dairy(6, 'BREEDING', '2026-01-01'), dairy(7, 'CALVING', '2026-10-01'),
  ] }, []],
  ['abrupt cattle weight loss needs review', { ...cow, weights: weights([500, 502, 501, 50]) }, ['weightChange:weight/4']],
  ['dog weight decimal error needs review', { ...animal, weights: weights([20, 20.2, 19.9, 201]) }, ['weightChange:weight/4']],
  ['duplicate meal with one spelling omission', { ...animal, meals: [
    meal(4, 'Evening biscuits', '2026-10-02T17:00:00Z'),
    meal(5, 'Evening biscuts', '2026-10-02T17:00:00Z'),
  ] }, ['duplicate:meal/4,meal/5']],
  ['confirmed duplicate across midnight', { ...animal, meals: [
    meal(4, 'Evening biscuits', '2026-10-02T23:59:00Z'),
    meal(5, 'Evening biscuits', '2026-10-03T00:01:00Z'),
  ] }, ['duplicate:meal/4,meal/5']],
  ['confirmed duplicate with transposed letters', { ...animal, meals: [
    meal(4, 'Chicken portion', '2026-10-02T17:00:00Z'),
    meal(5, 'Chikcen portion', '2026-10-02T17:00:00Z'),
  ] }, ['duplicate:meal/4,meal/5']],
  ['legitimate morning and evening portions', { ...animal, meals: [
    meal(4, 'Dry biscuits', '2026-10-02T07:00:00Z'),
    meal(5, 'Dry biscuits', '2026-10-02T19:00:00Z'),
  ] }, []],
  ['legitimate equal morning and evening milk yields', { ...cow, dairyRecords: [
    { ...dairy(4, 'MILK_YIELD', '2026-10-02', 12), notes: 'Morning milking' },
    { ...dairy(5, 'MILK_YIELD', '2026-10-02', 12), notes: 'Evening milking' },
  ] }, []],
  ['confirmed duplicate dairy entry', { ...cow, dairyRecords: [
    dairy(4, 'MILK_YIELD', '2026-10-02', 17), dairy(5, 'MILK_YIELD', '2026-10-02', 17),
  ] }, ['duplicate:dairy/4,dairy/5']],
]

// Follow-up comparison with owner-supplied session metadata. Original cases
// and labels remain frozen for comparison with the checkpoint results.
export const sessionEvaluationCases = evaluationCases.map(([scenario, animal, expected]) => {
  if (scenario !== 'legitimate equal morning and evening milk yields') return [scenario, animal, expected]
  return [scenario, {
    ...animal,
    dairyRecords: animal.dairyRecords.map((record, index) => ({
      ...record, session: index === 0 ? 'MORNING' : 'EVENING',
    })),
  }, expected]
})
