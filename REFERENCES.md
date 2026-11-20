# Leonis research references

Keep important research here by **topic**, not as a list of unexplained links.
For each new investigation record: research date, issue/question, source title and
URL, what it informed, affected files, and limitations or unresolved questions.
Prefer original publishers, official documentation and primary research. Separate
source evidence from Leonis design choices; never invent an access date or claim
an unverified source was checked. Do not store secrets or identifying interview data.

Frontend assets/design references are in [the frontend register](../leonis-frontend/REFERENCES.md).

## Barn dashboard — Pakistan dairy records and finances

**Researched:** 19 November 2026.
**Question:** Which records should the provisional Pakistan-focused barn dashboard support when owner interviews are unavailable?

| Source | Use in Leonis | Limits |
| --- | --- | --- |
| [SMEDA: Dairy Farm, 25 Cows — May 2025](https://smeda.org/phocadownload/Prefeasibility_Studies/Dairy/Dairy%20Farm%2025%20Cows%20Rs.%2050.83%20million%20May-2025.pdf) | Record categories: milk/animal income, feed, health, labour, utilities and maintenance. Printed pp. 10, 19–22. | Feasibility assumptions, not current prices or owner interviews. No rates, yields or projected returns become application defaults. |
| [SMEDA: Dairy Farm, 100 Cows — May 2025](https://smeda.org/phocadownload/Prefeasibility_Studies/Dairy/Dairy%20Farm%20100%20Cows%20Rs.%20160.56%20million%20May-2025.pdf) | Background comparison with another farm scale. | Consulted as context; its scale and financial assumptions are not the specification for every barn. |
| [Dairy Hub / Tetra Pak Pakistan: Mechanized Dairy Farming, hosted by UVAS](https://uvas.edu.pk/doc/advisory_services/Dairy-farming/english/14-Mechanized_Dairy_Farming.pdf) | Animal identification, individual production and income/expense record keeping; printed pp. 10–11, PDF p. 7. | Background guidance; publication date not established in this investigation. Hosting at UVAS does not make it a UVAS-authored publication. |
| [FAO: Small-Scale Dairy Farming Manual — Dairy Farm Accounting](https://www.fao.org/4/t1265e/t1290e01.htm) | Payments/receipts, milk-sale quantities and capital versus recurrent items; pp. 5–8. | General guidance, not Pakistan-specific market rates. Cash movement must not be presented as confirmed net profit. |

**Design decisions:** multiple barns; both milk and animal sales; actual owner-entered PKR amounts; shared costs remain identifiable; no automatic overhead allocation. These are provisional product decisions, not source quotations or completed interview findings.

**Related work:** [research/specification](docs/barn-dashboard-research.md), [future interview prompts](docs/barn-dashboard-interviews.md), [v2 status](docs/v2-status.md).
**Implementation update, 19 November 2026:** provisional dashboard implemented. See [behavior/API](docs/barn-dashboard.md), [financial/date validation](src/barn/records.js), [report calculations](src/barn/report.js), [transactions and assignment logic](src/barn/service.js), [unit assertions](test/barn.test.js), and [isolated integration checks](test/barn.integration.test.js). Exclusive transfer-date boundaries, dated settlements, optimistic edit versions and no automatic shared-cost allocation are explicit Leonis engineering choices; they are not standards quoted from these sources. Owner workflow review is pending.

## Record quality and cited species/breed guidance

**Registered:** 19 November 2026, imported from existing code and research notes.
**Sources checked:** 18 November 2026, according to `docs/species-record-expectations.md`. These links were not fetched again for this register update.
**Question:** What published guidance supports the curated species entries and record-completeness prompts?

| Source | Existing use | Limits |
| --- | --- | --- |
| [AAHA: Nutrition and Weight Management Guidelines — Screening Evaluation](https://www.aaha.org/resources/2021-aaha-nutrition-and-weight-management-guidelines/screening-evaluation/) | Weight and dietary-history context for companion-animal records. | Existing notes report indexed official text with direct retrieval returning 403. The Leonis missing-weight trigger is a product rule, not a clinical threshold prescribed by this source. |
| [Jamaica Dairy Development Board: Record Keeping](https://www.jddb.gov.jm/page/record-keeping) | Identification, production, breeding and calving record context. | Not Pakistan-specific; a missing-history finding is an owner-review prompt, not proof of a health problem. |
| [Cat Fanciers’ Association: Maine Coon](https://cfa.org/breed/maine-coon-cat/) | Source for the curated Maine Coon coat-care entry. | Breed background only; not personalized veterinary advice. |
| [Holstein Association USA: Holstein 101](https://www.holsteinusa.com/holstein_breed/holstein101.html) | Source for the curated Holstein breed entry. | Breed context does not validate an individual animal's yield or predict its performance. |

**Related work:** [source/rule mapping](docs/species-record-expectations.md), [implementation](src/quality/speciesGuide.js), [tests](test/speciesGuide.test.js).

## Evaluation and engineering assumptions

**Registered:** 19 November 2026, from current repository evidence.

- [Benchmark methods, results and limits](benchmark/README.md) documents the synthetic fixtures, comparison methods, rule improvements and remaining false positive. It is internal evidence, not an independent external accuracy study.
- [Rule implementation](src/quality/rules.js) and [duplicate tests](test/duplicateDetection.test.js) define timing and fuzzy-match behavior. Thresholds/windows are implementation choices pending external validation; do not attribute them to the clinical or farming sources above.
- [Record-quality tests](test/recordQuality.test.js), [metric tests](test/evaluationMetrics.test.js) and [integration checks](test/recordQuality.integration.test.js) document reproducible behavior. Passing tests does not establish clinical validity or real-world accuracy.

## New entry template

- **Date researched:** YYYY-MM-DD, or explicitly unknown.
- **Issue / question:** What problem was being investigated?
- **Source:** Original publisher, title, direct URL and relevant section/page.
- **Used for:** Which decision or finding did it support?
- **Affected work:** Code, specification, tests or documentation links.
- **Limits / follow-up:** Age, access restrictions, assumptions and open questions.

## Pets / Livestock workspace separation

**Registered:** 20 November 2026. **Source:** the owner's conversation decision, not external research.
**Issue:** pet-only users should not have barn/livestock controls in their normal workflow.
**Decision:** one account with Pets/Livestock preferences, signup choice and later switching; commerce remains shared. Preference changes retain all records and do not confer admin privileges.
**Affected work:** [behavior/API](docs/workspaces.md), [input validation](src/account/workspaces.js), [account routes](src/routes/accountRoutes.js), [migration](prisma/migrations/20261119020000_workspaces/migration.sql), [tests](test/workspaces.integration.test.js).
**Evidence/limits:** isolated legacy-fixture backfill and API checks validate behavior, not a new account-authorization model. Owner-scoped APIs remain the security boundary; workspaces are interface organization.

## Deployment on the existing Render/Vercel services

**Researched:** 20 November 2026.
**Issue:** prepare repeatable v2 builds and migrations while retaining v1 hosting.

| Primary source | Use | Limits |
| --- | --- | --- |
| [Render: Node.js versions](https://render.com/docs/node-version) | Bound runtime to Node 24; document higher-precedence dashboard/file overrides. | Existing service settings were not inspected. |
| [Render: deploy steps](https://render.com/docs/deploys) | Separate installation/client generation, migrations and application startup. Paid-service pre-deploy support is distinguished from a controlled release job for free services. | Current service plan and release-job access remain unconfirmed; no automatic migration was configured. |
| [Render: health checks](https://render.com/docs/health-checks) | Public `/health` supplies an HTTP liveness target. | Leonis deliberately performs no database query here; database readiness requires a separate check. |
| [Prisma v7: deploying database changes](https://www.prisma.io/docs/orm/v7/prisma-client/deployment/deploy-database-changes-with-prisma-migrate) | Checked-in migrations and `migrate deploy` in the release workflow; retain Prisma CLI for deployment tooling. | A migration command is not a backup or a guarantee against data loss. Live history must be checked before use. |

**Affected work:** [release guide](docs/deploy-v2.md), package/lock runtime metadata,
Prisma build script, README/AGENTS commands, and [liveness route](index.js).
Local preparation does not establish that live database history matches the repo.
No production settings, secrets, migrations or deployments were changed.

### Free-plan release follow-up

**Checked:** 20 November 2026; the owner confirmed the current Render service is Free.

- [Render: free web-service limitations](https://render.com/docs/free) confirms no shell access; [deploy steps](https://render.com/docs/deploys#pre-deploy-command) limits pre-deploy commands to paid services. This constrains the release runner; no paid upgrade was requested or configured.
- [GitHub: manually running a workflow](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow) requires a manual-dispatch workflow on the default branch. A workflow committed only to `version-two` would not by itself provide the proposed manual release job. No default-branch or `main` change was made.
- **Affected work:** [confirmed free-plan path](docs/deploy-v2.md#confirmed-free-plan-path). The Render dashboard opened at sign-in; live service settings and Neon migration history remain unverified. No database credentials were accessed.

### Authenticated hosting inspection and database preflight

**Checked:** 20 November 2026, after owner sign-in/authorization. This updates the earlier sign-in limitation for Render only.

- **Direct evidence:** [Render service settings](https://dashboard.render.com/web/srv-da5ib3rtqb8s73ainuag/settings), configured environment variable names (values masked), and [successful deployment](https://dashboard.render.com/web/srv-da5ib3rtqb8s73ainuag/deploys/dep-dbe8khbbc2fs73fviee0). Live source is `03d7b345f8b49357403c6de052d4a076e253a818` on `main`; auto-deploy is On Commit. Exact observed/proposed commands are distinguished in the [release guide](docs/deploy-v2.md). No settings were changed.
- **Runtime limit:** no `NODE_VERSION` variable or linked environment group is configured. The exact deployed Git commit has no Node-version files/engine declaration. Deployment logs expired; the actual running version cannot be inferred reliably from the current platform default.
- [Neon: branching](https://neon.com/docs/concepts/branch-your-backend) supports a dedicated child branch for rehearsing database changes without writing to the parent. The actual project, parent branch, plan limits and current schema remain unverified.
- [Neon: backup strategies](https://neon.com/docs/postgres/backup-restore/backups) distinguishes history-based instant recovery from `pg_dump`/`pg_restore` backups. Project-specific recovery settings must be inspected; no backup or restore rehearsal has been performed.
- **Affected work:** [read-only preflight SQL](docs/v2-database-preflight.sql) and release/status documentation. The SQL reads metadata and aggregate counts only, within `BEGIN READ ONLY`; it has not been executed against Neon. The Neon console requires owner sign-in. No secret values or individual records were accessed during this inspection.

### Neon migration and recovery audit

**Checked:** 20 November 2026, after owner sign-in. This supersedes the earlier Neon access limitation.

- **Direct evidence:** authenticated Leonis project/branch overviews, production Backup & Restore, and SQL Editor metadata/count results. [Database audit](docs/v2-database-audit.md) records the exact branch/compute IDs, counts, ten migration checksums and limits. Both SQL transactions reported read-only mode. No schema/application-data writes or new backups/branches were performed.
- **Verification:** production's four existing migration checksums and development's six additional checksums match local SHA-256 hashes of the checked-in SQL. History is consistent; this is not a full schema-drift or restore verification. Render's database URL remained masked, so its actual target still needs private confirmation.
- [Neon: backup strategies](https://neon.com/docs/postgres/backup-restore/backups) supports choosing a recovery method and validating it separately from migration history. Production currently shows six hours of history and no snapshots.
- [Neon: current plan limits and snapshots](https://neon.com/docs/introduction/plans#snapshots) lists one manual snapshot on Free and documents storage pricing. Backup choice is pending; no billable upgrade or snapshot has been requested automatically.
- [Neon engineering: passwordless psql](https://neon.com/blog/how-psql-pg-neon-tech-works) describes browser selection of a project/endpoint for a temporary CLI connection without copying database credentials. Published 14 August 2024; a potential tooling route only. It has not been tested for this project's export, and it is not evidence that `pg_dump` has succeeded.

### Local export, restore and migration rehearsal

**Checked:** 20 November 2026. Owner selected local export and authorized the temporary Neon connection. This updates the earlier untested-export limitation.

- [Neon: backups with pg_dump](https://neon.com/docs/manage/backup-pg-dump) supports a local custom-format archive and `pg_restore` verification, matching the server's PostgreSQL major version and avoiding pooled connections. PostgreSQL 18.7 tools were run from the official Docker image; project dependencies were unchanged.
- [PostgreSQL 18: pg_dump](https://www.postgresql.org/docs/18/app-pgdump.html) documents consistent exports, custom archives and schema/ownership options. Leonis exported the public application schema without PostgreSQL ownership/ACL metadata; external media and hosting configuration are outside this archive.
- [Neon engineering: passwordless connection](https://neon.com/blog/how-psql-pg-neon-tech-works) describes the temporary browser selection/authentication mechanism. It was successfully used for this `pg_dump` export after owner authorization, with verified TLS and read-only source-session options. No database password or `.env` file was accessed. Browser UI automation was unavailable; source selection was completed by the owner and restored metadata matched the production audit.
- **Direct evidence:** [verification notes](docs/v2-backup-verification.md) and owner-only artifacts under ignored `.local-backups/`. Export, isolated restore, all six pending migrations, original-record content/sequence comparisons and final migration status passed. Restored test databases were removed afterward. No Neon data/schema, Render settings or deployment was changed.
- **Limits:** a point-in-time public-schema database backup and local rehearsal, not an external-media backup or final hosted application validation. Render's masked database target still needs private confirmation, and the backup must be refreshed if production changes before release.
