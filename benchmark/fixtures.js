// Cases are labeled by scenario, independently of the rule implementation.
const profile = { id: 1, name: 'Synthetic animal', species: 'cat', weights: [], meals: [], vetVisits: [], dairyRecords: [] }
const cattle = { ...profile, species: 'dairy-cattle' }
const milk = { id: 1, kind: 'MILK_YIELD', recordedOn: '2026-06-02', liters: 18 }
const vet = { id: 1, reason: 'Annual examination', vetName: 'Test clinic', visitDate: '2026-06-02' }
const weightHistory = [4.1, 4, 4.2].map((weight, index) => ({ id: index + 1, weight, createdAt: `2026-06-0${index + 1}` }))
const weight = (value, createdAt) => [...weightHistory, { id: 4, weight: value, createdAt }]
const meal = { id: 1, name: 'Chicken dinner', amount: '50 g', createdAt: '2026-06-02T12:00:00Z' }

export const cases = [
  ['clean cat', profile, []],
  ['clean cattle', { ...cattle, dairyRecords: [milk] }, []],
  ['missing animal name', { ...profile, name: ' ' }, ['profileRequired:profile/1']],
  ['negative profile age', { ...profile, age: -2 }, ['ageNonnegative:profile/1']],
  ['zero weight', { ...profile, weights: [{ id: 1, weight: 0 }] }, ['weightPositive:weight/1']],
  ['missing milk volume', { ...cattle, dairyRecords: [{ ...milk, liters: null }] }, ['milkRequired:dairy/1']],
  ['invalid milk unit', { ...cattle, dairyRecords: [{ ...milk, unit: 'gal' }] }, ['milkValid:dairy/1']],
  ['negative milk volume', { ...cattle, dairyRecords: [{ ...milk, liters: -1 }] }, ['milkValid:dairy/1']],
  ['future visit', { ...profile, vetVisits: [{ ...vet, visitDate: '2026-06-18' }] }, ['dateValid:vetVisit/1']],
  ['impossible calendar date', { ...profile, vetVisits: [{ ...vet, visitDate: '2026-02-30' }] }, ['dateValid:vetVisit/1']],
  ['reversed follow-up', { ...profile, vetVisits: [{ ...vet, nextVisit: '2026-05-29' }] }, ['visitOrder:vetVisit/1']],
  ['calving before available breeding', { ...cattle, dairyRecords: [
    { id: 1, kind: 'CALVING', recordedOn: '2026-04-11' },
    { id: 2, kind: 'BREEDING', recordedOn: '2026-05-06' },
  ] }, ['calvingOrder:dairy/1,dairy/2']],
  ['suspect abrupt weight change', { ...profile, weights: weight(42, '2026-06-04') }, ['weightChange:weight/4']],
  ['unusual gain over months', { ...profile, weights: weight(6.5, '2026-09-01') }, []],
  ['normal short-term weight gain', { ...profile, weights: weight(4.7, '2026-06-04') }, []],
  ['exact duplicate visit', { ...profile, vetVisits: [vet, { ...vet, id: 2 }] }, ['duplicate:vetVisit/1,vetVisit/2']],
  ['near duplicate meal', { ...profile, meals: [meal, { ...meal, id: 2, name: 'Chiken dinner' }] }, ['duplicate:meal/1,meal/2']],
  ['same meal on another day', { ...profile, meals: [meal, { ...meal, id: 2, createdAt: '2026-06-03' }] }, []],
  ['different clinics on the same day', { ...profile, vetVisits: [vet, { ...vet, id: 2, vetName: 'Second clinic' }] }, []],
  ['previous calving with missing breeding history', { ...cattle, dairyRecords: [{ id: 1, kind: 'CALVING', recordedOn: '2026-01-02' }] }, []],
  ['zero milk volume', { ...cattle, dairyRecords: [{ ...milk, liters: 0 }] }, []],
  ['two distinct milk measurements', { ...cattle, dairyRecords: [milk, { ...milk, id: 2, liters: 12 }] }, []],
]
