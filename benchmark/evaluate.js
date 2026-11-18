import { assess, ruleCatalog } from '../src/quality/rules.js'
import { cases } from './fixtures.js'

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

export function evaluate(baseline) {
  const totals = tally()
  const rules = Object.fromEntries(Object.keys(ruleCatalog).map(rule => [rule, tally()]))
  for (const [, animal, expected] of cases) {
    const predictions = new Set(assess(animal, { asOf, baseline }).map(findingKey))
    const labels = new Set(expected)
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
  return { overall: metrics(totals), perRule: Object.fromEntries(Object.entries(rules).map(([id, counts]) => [id, metrics(counts)])) }
}

if (import.meta.main) {
  console.log(JSON.stringify({ cases: cases.length, fieldOnly: evaluate(true), allRules: evaluate(false) }, null, 2))
}
