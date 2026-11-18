# Record quality benchmark

Run `node --test` for the rule assertions and `node benchmark/evaluate.js`
for the overall and per-rule metric report. Fixtures are labeled explicitly
by scenario rather than deriving labels from the rule output. The benchmark
uses the same UTC assessment date and fixtures for both configurations.

| Configuration | Findings detected | Precision | Recall | F1 | False-positive rate |
| --- | ---: | ---: | ---: | ---: | ---: |
| Field validation | 8 / 13 | 100% | 61.5% | 76.2% | 0% |
| Field and cross-record checks | 13 / 13 | 100% | 100% | 100% | 0% |

A prediction matches by rule and affected record IDs. False-positive rate is
the fraction of negative cases with any finding, overall or for the given rule.
Undefined metrics are reported as `null`.

These 22 hand-authored synthetic cases are regression fixtures. They are small,
purpose-built and maintained in the same project as the rules. They do not
estimate real-world accuracy, validate clinical thresholds, or constitute an
independent holdout dataset. An independent labeled evaluation should include
ambiguous true duplicates, valid repeat entries and edge cases outside the
current rules.

For the HTTP integration check, start the backend against a disposable migrated
database, then run:

```bash
LEONIS_TEST_API=http://localhost:7461/api node --test --test-reporter=tap
```

## Second evaluation set

Run `node benchmark/evaluate.js evaluation` to evaluate 22 additional scenarios
with a fixed assessment date of 2026-10-20. The default command still runs the
original regression fixtures. Both commands return per-rule metrics and a
`mismatches` list naming missed findings and unexpected flags.

Labels in `evaluationCases.js` were written before executing this set. They
represent intended owner-review outcomes, including synthetic scenarios with
known duplicate provenance and legitimate repeated entries. The engine was
held at checkpoint `55f72a1` throughout this evaluation.

| Configuration | TP | FP | FN | Precision | Recall | F1 | Negative-case false-positive rate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Field validation | 7 | 0 | 8 | 100% | 46.7% | 63.6% | 0 / 7 |
| Field and cross-record checks | 13 | 2 | 2 | 86.7% | 86.7% | 86.7% | 2 / 7 (28.6%) |

The denominator for the final column is the seven scenarios with no expected
findings. Finding precision and recall count rule-and-record matches rather
than scenarios. Results are reported separately from the original fixtures.

The full engine misses a duplicate two minutes across midnight and a name
with transposed letters. It flags two legitimate repeated events, morning
and evening meals and equal morning and evening milk yields. The dairy schema
stores dates without milking times, so it cannot reliably distinguish the
latter from a duplicated record. Those cases should guide the next improvement.

These are author-labeled synthetic scenarios, created after inspecting the
existing engine. They are a separate challenge set, with no external labeling
or blinded holdout. Assumptions about whether pairs are duplicates are explicit
in each scenario name. Review by another person and owner records would
strengthen the evidence. No clinical validity or real-world accuracy is claimed.

Run the calculation checks with:

```bash
node --test --test-reporter=tap test/evaluationMetrics.test.js test/recordQuality.test.js
```

## Duplicate detection follow-up

Meals now use a 15-minute elapsed-time window, including across UTC midnight.
Name matching permits one adjacent-letter transposition in addition to the
previous single-edit comparisons. Fifteen minutes is an implementation default
for review candidates, pending owner feedback. Vet visits still use UTC dates.

Milk records now accept an optional session, morning, afternoon, or evening.
Different known sessions distinguish equal yields. Unknown legacy sessions
continue to produce possible-duplicate findings rather than being assigned
invented session values. Existing clients can omit the new field on updates
to preserve its saved value, or send null to clear it.

Results after this change, on the unchanged evaluation cases:

| Configuration | TP | FP | FN | Precision | Recall | F1 | Negative-case false-positive rate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Full engine | 15 | 1 | 0 | 93.8% | 100% | 96.8% | 1 / 7 (14.3%) |

The remaining false positive is the legitimate equal milk yields with unknown
sessions. Run `node benchmark/evaluate.js evaluation-sessions` for a separate
comparison that supplies morning/evening metadata to that case, retaining its
original label. That comparison produces 15 TP, 0 FP, 0 FN. It demonstrates the
effect of extra metadata and is not a blinded accuracy estimate.

These cases now informed rule development, so subsequent results are development
results. External review and a fresh held-out dataset remain future work.

Apply the additive milking-session migration against your configured development
database before starting the updated server:

```bash
npx prisma generate
npx prisma migrate deploy
```

Run duplicate boundary and backward-compatibility checks with
`node --test --test-reporter=tap test/duplicateDetection.test.js`.
