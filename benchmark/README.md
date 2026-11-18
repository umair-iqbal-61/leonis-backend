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
