# Species record expectations

The guide and source metadata live in `src/quality/speciesGuide.js`. The API
serves matching entries from the owner-scoped `GET /api/pets/:petId/guide`
route. General entries are available for dogs, cats and dairy cattle, with
breed entries for Maine Coon and Holstein. Other profiles retain their data
and show the existing unavailable-guide message.

## Implemented checks

| Rule | Condition | Owner action |
| --- | --- | --- |
| weightHistoryMissing | Dog or cat with a saved vet visit, no profile weight and no weight logs | Enter an available weight, or dismiss if not applicable |
| breedingHistoryMissing | Dairy cattle with a calving record and no breeding records | Enter available breeding history, or dismiss if unknown |

Both findings have medium severity and concern missing information in Leonis.
They do not determine whether an examination or breeding event actually
occurred. These trigger conditions and severity are application policy derived
from the record-keeping references, not requirements stated by those sources.
A present invalid weight remains the responsibility of the existing validity
rule. Cattle without calving records have no breeding-history requirement.
Breed-specific facts inform guide content and do not impose numeric limits.

Sources checked on 18 November 2026:

- [AAHA Screening Evaluation](https://www.aaha.org/resources/2021-aaha-nutrition-and-weight-management-guidelines/screening-evaluation/) includes body weight and dietary history in nutritional screening. The official indexed text was available, while direct retrieval returned 403.
- [Jamaica Dairy Development Board Record Keeping](https://www.jddb.gov.jm/page/record-keeping) describes identification, production, breeding and calving records.
- [Cat Fanciers’ Association Maine Coon](https://cfa.org/breed/maine-coon-cat/) supports the breed’s coat-care entry.
- [Holstein Association USA](https://www.holsteinusa.com/holstein_breed/holstein101.html) supports the breed’s production background.

The API report adds a `source` object for these findings so the review screen
and printed report can show the reference. No database migration is required.
Existing review persistence and automatic refresh on record changes apply.

Vaccination-due rules need structured vaccination records, age and location
context. They are deferred. No vaccination dates or numeric breed ranges are
inferred from general breed descriptions.

## Evaluation scope

Existing benchmark fixtures continue to evaluate `assess`, the structural,
cross-record and duplicate rule set used in the historical comparison.
Production uses `assessRecordQuality`, which combines that set with these
source-backed completeness checks. Historical metrics do not measure the new
checks. `test/speciesGuide.test.js` exercises their applicability, missing and
present data, and source selection. HTTP integration checks exercise owner
isolation, automatic refresh, dismissal persistence and resolution after entry.
