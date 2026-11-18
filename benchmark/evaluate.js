import { assess, ruleCatalog } from '../src/quality/rules.js'
import { cases } from './fixtures.js'
import { evaluationCases, evaluationDate, sessionEvaluationCases } from './evaluationCases.js'

export const asOf = '2026-06-14'
export const findingKey = item => `${item.ruleId}:${item.records.map(({ type, id }) => `${type}/${id}`).sort().join(',')}`
const tally = () => ({ tp: 0, fp: 0, fn: 0, negativeCases: 0, flaggedNegativeCases: 0 })
const ratio = (numerator, denominator) => denominator ? numerator / denominator : null

function metrics({ tp, fp, fn, negativeCases, flaggedNegativeCases }) {
  return {
    tp, fp, fn, negativeCases,
    precision: ratio(tp, tp + fp),
    recall: ratio(tp, tp + fn),
    f1: ratio(2 * tp, 2 * tp + fp + fn),
    falsePositiveRate: ratio(flaggedNegativeCases, negativeCases),
  }
}

export function evaluate(baseline, dataset = cases, assessmentDate = asOf) {
  const totals = tally()
  const rules = Object.fromEntries(Object.keys(ruleCatalog).map(rule => [rule, tally()]))
  const mismatches = []
  for (const [scenario, animal, expected] of dataset) {
    const predictions = new Set(assess(animal, { asOf: assessmentDate, baseline }).map(findingKey))
    const labels = new Set(expected)
    const missed = [...labels].filter(key => !predictions.has(key))
    const unexpected = [...predictions].filter(key => !labels.has(key))
    if (missed.length || unexpected.length) mismatches.push({ scenario, missed, unexpected })
    for (const [rule, counts] of [['overall', totals], ...Object.entries(rules)]) {
      const matches = key => rule === 'overall' || key.startsWith(`${rule}:`)
      const positive = expected.filter(matches)
      const flagged = [...predictions].filter(matches)
      counts.tp += flagged.filter(key => labels.has(key)).length
      counts.fp += flagged.filter(key => !labels.has(key)).length
      counts.fn += positive.filter(key => !predictions.has(key)).length
      if (!positive.length) {
        counts.negativeCases++
        if (flagged.length) counts.flaggedNegativeCases++
      }
    }
  }
  return { mismatches, overall: metrics(totals), perRule: Object.fromEntries(Object.entries(rules).map(([id, counts]) => [id, metrics(counts)])) }
}

if (import.meta.main) {
  const datasetName = process.argv[2] ?? 'regression'
  if (!['regression', 'evaluation', 'evaluation-sessions'].includes(datasetName)) {
    console.error('Usage: node benchmark/evaluate.js [regression|evaluation|evaluation-sessions]')
    process.exit(1)
  }
  const datasets = { regression: cases, evaluation: evaluationCases, 'evaluation-sessions': sessionEvaluationCases }
  const dataset = datasets[datasetName]
  const date = datasetName === 'regression' ? asOf : evaluationDate
  console.log(JSON.stringify({
    dataset: datasetName, asOf: date, cases: dataset.length,
    fieldOnly: evaluate(true, dataset, date), allRules: evaluate(false, dataset, date),
  }, null, 2))
}
