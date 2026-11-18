import { assess } from './rules.js'

const nutritionSource = {
  title: 'AAHA Nutrition and Weight Management Guidelines — Screening Evaluation',
  url: 'https://www.aaha.org/resources/2021-aaha-nutrition-and-weight-management-guidelines/screening-evaluation/',
}
const dairySource = {
  title: 'Jamaica Dairy Development Board — Record Keeping',
  url: 'https://www.jddb.gov.jm/page/record-keeping',
}

export const expectationSources = {
  weightHistoryMissing: nutritionSource,
  breedingHistoryMissing: dairySource,
}

const entries = [
  {
    id: 'companion-records', species: ['cat', 'dog'],
    title: { en: 'Weight and visit records', ur: 'وزن اور ملاقات کے ریکارڈ' },
    text: {
      en: 'Keep weight measurements alongside veterinary visit history. A nutritional assessment uses body weight and dietary history. In Leonis, a saved visit with no profile weight or weight log prompts a record review.',
      ur: 'معالج سے ملاقات کی تفصیلات کے ساتھ وزن کی پیمائش بھی محفوظ کریں۔ غذائی جائزے میں وزن اور خوراک کی تاریخ استعمال ہوتی ہے۔ لیونس میں ملاقات درج ہو مگر پروفائل یا وزن کے ریکارڈ میں پیمائش نہ ہو تو جائزے کا پیغام آتا ہے۔',
    },
    source: nutritionSource,
  },
  {
    id: 'cattle-records', species: ['dairy-cattle'],
    title: { en: 'Dairy cattle records', ur: 'ڈیری مویشیوں کے ریکارڈ' },
    text: {
      en: 'Keep identification, milk production, breeding and calving history where applicable. In Leonis, a calving entry with no breeding history prompts a record review. Milk and reproductive records apply to the animal’s actual history.',
      ur: 'جہاں متعلق ہو، شناخت، دودھ کی پیداوار، افزائش اور بچھڑے کی پیدائش کی تاریخ محفوظ کریں۔ لیونس میں پیدائش کا ریکارڈ ہو مگر افزائش کی تاریخ نہ ہو تو جائزے کا پیغام آتا ہے۔ دودھ اور افزائش کے ریکارڈ جانور کی اصل تاریخ کے مطابق درج کریں۔',
    },
    source: dairySource,
  },
  {
    id: 'maine-coon', species: ['cat'], breeds: ['maine coon'],
    title: { en: 'Maine Coon', ur: 'مین کون' },
    text: {
      en: 'This longhaired breed benefits from regular combing to maintain its coat.',
      ur: 'اس لمبے بالوں والی نسل کے بال سنبھالنے کے لیے باقاعدہ کنگھی مفید ہے۔',
    },
    source: { title: 'Cat Fanciers’ Association', url: 'https://cfa.org/breed/maine-coon-cat/' },
  },
  {
    id: 'holstein', species: ['dairy-cattle'], breeds: ['holstein', 'holstein friesian', 'holstein-friesian'],
    title: { en: 'Holstein', ur: 'ہولسٹین' },
    text: {
      en: 'Holstein cattle are known for milk production. Use the individual animal’s measured yield to track its production.',
      ur: 'ہولسٹین مویشی دودھ کی پیداوار کے لیے مشہور ہیں۔ پیداوار جاننے کے لیے ہر جانور کی اصل پیمائش استعمال کریں۔',
    },
    source: { title: 'Holstein Association USA', url: 'https://www.holsteinusa.com/holstein_breed/holstein101.html' },
  },
]

export function speciesGuide(animal) {
  const breed = String(animal.breed ?? '').trim().toLowerCase().replace(/\s+/g, ' ')
  return entries.filter(entry => entry.species.includes(animal.species) &&
    (!entry.breeds || entry.breeds.includes(breed)))
    .map(({ id, title, text, source }) => ({ id, title, text, source }))
}

export function assessRecordExpectations(animal) {
  const findings = []
  const add = (ruleId, records) => findings.push({
    ruleId, dimension: 'completeness', severity: 'medium',
    records, explanationKey: ruleId, parameters: {},
  })
  if (['dog', 'cat'].includes(animal.species) && animal.vetVisits.length &&
      animal.weight == null && !animal.weights.length) {
    add('weightHistoryMissing', [{ type: 'profile', id: animal.id, fields: ['weight'] }])
  }
  const calving = animal.dairyRecords.filter(item => item.kind === 'CALVING')
  if (animal.species === 'dairy-cattle' && calving.length &&
      !animal.dairyRecords.some(item => item.kind === 'BREEDING')) {
    // Point to one stable record, irrespective of retrieval order.
    const first = [...calving].sort((a, b) => a.id - b.id)[0]
    add('breedingHistoryMissing', [{ type: 'dairy', id: first.id, fields: [] }])
  }
  return findings
}

export function assessRecordQuality(animal, options) {
  return [...assess(animal, options), ...assessRecordExpectations(animal)]
}
