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

### Confirmed production target and proposed Free-service start gate

**Checked:** 20 November 2026.

- **Owner evidence:** after privately reviewing Render's `DATABASE_URL`, the owner confirmed the production endpoint. No credential or connection string was shared. The intended live target matches the [verified export](docs/v2-backup-verification.md).
- **GitHub evidence:** read-only branch lookups returned `Branch not found` for `version-two` in both Leonis repositories. The local branches have not been published. Vercel production-branch settings must be inspected before the frontend push.
- [Render: deploy commands and manual deploys](https://render.com/docs/deploys) supports a configurable start command with auto-deploy disabled for a controlled release. Free lacks a separate pre-deploy phase.
- [Prisma v7: deployment migrations](https://www.prisma.io/docs/orm/v7/prisma-client/deployment/deploy-database-changes-with-prisma-migrate) specifies checked-in migration deployment and availability of Prisma CLI. [Prisma's published deployment example](https://github.com/prisma/skills/blob/main/prisma-cli/references/migrate-deploy.md) shows migration success gating application startup.
- **Proposed use:** Render start command `npx prisma migrate deploy && npm start`, with locked dependencies/Prisma generation in the build and manual release from `version-two`. This combines documented capabilities; it is a Leonis implementation decision, not a dedicated Render pre-deploy feature. It will check pending migrations on every service start. No live command/setting has been changed.
- **Connection state:** Vercel and Render connectors were found available and suggested, then confirmed installed by the plugin directory. Account connections and provider tools have not yet been verified in this chat; live Vercel settings remain unverified.

### Verified hosting connectors and frontend configuration

**Checked:** 20 November 2026, superseding the pending provider-access note above.

- Render authentication succeeded. The confirmed workspace/service IDs match the earlier Dashboard inspection; `get_service` and deployment history verify `main`, auto-deploy enabled, the old build/start commands, Free compute and live commit `03d7b345f8b49357403c6de052d4a076e253a818`. The MCP exposes deployment triggers but not branch/build/start updates; use the Dashboard for those approved changes.
- Vercel's API first required authorization for `umair-iqbal-projects`; the owner approved its single-use team-consent link. Project/deployment/public-variable reads then succeeded. [Frontend inspection register](../leonis-frontend/REFERENCES.md#authenticated-vercel-release-inspection) records exact team/project/deployment identities. Build commands and production branch were verified in the Dashboard because the connector omits them.
- **Use:** prepare dedicated `version-two` branches and a protected frontend preview while Production tracks `main`. The preview is an interface/build review, not a production-API smoke test; the production CORS allowlist excludes preview domains. No new CORS permission or production setting was added.
- **Limits:** source checks and local migration rehearsal pass, but publication/migration still require the final release review and hosted validation. No credential was retrieved except the explicitly public frontend API base.

### Published candidates and final release review

**Checked:** 20 November 2026, updating the earlier unpublished-branch and pending-preview notes.

- Both `version-two` branches are pushed. The [production release review](docs/v2-production-release-review.md) freezes the exact remote candidate commits and records the unchanged live deployment IDs. Later local documentation changes do not alter those candidates.
- Vercel reports the protected frontend candidate READY. Browser checks covered landing/signup, direct-route reloads, 320/390 px widths, English/Urdu RTL and light/dark themes. No production account/order was created; preview API workflows remain outside the verified scope because CORS excludes its origin.
- A local archive check confirmed the requested existing admin username exactly once without printing other account fields. This is backup evidence, not proof of a later production role grant.
- [Vercel: staging and promoting a production deployment](https://vercel.com/docs/deployments/promoting-a-deployment#staging-and-promoting-a-production-deployment) documents disabling domain auto-assignment before staging and promoting the same production build without a rebuild. [Project update API](https://vercel.com/docs/rest-api/projects/update-an-existing-project) exposes `autoAssignCustomDomains` and build/install/output settings. The connector does not expose production-branch updates, so branch tracking requires the Dashboard.
- **Limits:** the production release is proposed, not performed. Backup freshness, actual migration/deployment results, live admin access and final hosted API checks remain release-time work. Render auto-deploy and Vercel automatic domain assignment are proposed to remain disabled for manual releases.

### Executed production release

**Checked:** 20 November 2026, after the owner resumed the held release. This supersedes the pending-publication notes above.

- **Direct evidence:** Render deployment `dep-dbvvt33rjlhs73fu1n80` is live on the frozen backend candidate; migration logs show all six pending migrations succeeded. Vercel production deployment `dpl_6tdh3MqhPWFiULQn7iKdXYWa1pnX` is READY, and the alias API confirms it serves the existing custom domain.
- **Database evidence:** read-only aggregate comparisons before and after migration matched all original fields/counts across seven legacy tables. All ten migration checksums match. Workspace validity and closed/unconfigured checkout passed. A guarded owner-authorized grant then enabled only the named existing store admin.
- **Operational evidence:** public HTTP/API/CORS and anonymous-access checks pass; live mobile store/marketplace render in Urdu RTL and both themes. Render's post-live error-level query returned no logs. Future publication remains manual on both hosts.
- **Affected work / limits:** [release results](docs/v2-release-results.md) records exact versions and remaining private-account browser checks. No secret values, new dependencies, paid resources or `main` changes were involved. Existing pre-release backups do not contain later v2 writes.

### Release dependency audit follow-up

**Checked:** 20 November 2026, after npm reported audit warnings during the Render build.

- [Effect advisory GHSA-7589-6fvf-x4pw](https://github.com/advisories/GHSA-7589-6fvf-x4pw) describes regex denial of service in `Schema.TemplateLiteral` when untrusted inputs reach affected schemas; the publisher lists `3.22.1` as patched.
- **Local evidence:** `npm audit --omit=dev --json --ignore-scripts` reports three high-severity entries on the Prisma/config/Effect dependency chain. Handwritten app/config sources contain no direct Effect or TemplateLiteral use. This does not establish transitive exploitability or prove absence of exposure.
- **Follow-up review:** `npm ls effect @prisma/config prisma @prisma/client --omit=dev` confirms `@prisma/client@7.9.1` → `prisma@7.10.1` → `@prisma/config@7.10.1` → `effect@3.20.0`. The installed `@prisma/config` declares an exact Effect pin and uses Effect schemas to decode Prisma CLI configuration. Its bundled entry point contains no `TemplateLiteral` reference. Leonis's CLI configuration reads the schema and migration paths and obtains the database URL from the process environment. This static review found no path from application requests to the affected decoder in the inspected code. It did not trace every bundled dependency at runtime.
- [Prisma ORM release status](https://www.prisma.io/docs/orm/release-status) documents the Prisma 8 CLI transition and the need to retain Prisma 7 for the existing generate and migration workflow. With owner approval, evaluate a scoped npm override to `3.22.1` on development and verify dependency resolution, client generation, migration commands and backend tests before considering manual publication. The override needs compatibility testing because it replaces an exact upstream pin.
- **Use / limits:** [release results](docs/v2-release-results.md) tracks compatible dependency maintenance as follow-up. No automatic major Prisma downgrade, package upgrade or lockfile change was made. Any upgrade needs owner approval and targeted compatibility checks.

### Owner-confirmed production login recovery

**Recorded:** 20 November 2026; source is the owner's report and inspected local reset-script behavior, not external research.

- The password-reset script targets its configured database. The owner initially reset the separate development database, then successfully reset the existing live account using a temporary production connection override with dotenv disabled. No `.env` edits or password sharing were requested.
- The supplied command checked the confirmed production endpoint/database before running `scripts/resetPassword.js umairiqbal`. The owner confirmed the new password works on the live website.
- **Limits:** the existing reset script remains untracked. Login was confirmed by the owner; remaining authenticated features were not independently rechecked after release. See [release results](docs/v2-release-results.md).

### Account safeguards

**Checked:** 27 November 2026.

- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html) informs the minimum length for new passwords and login throttling in the account routes. Legacy passwords are still checked against their existing hashes.
- [Express proxy guidance](https://expressjs.com/en/guide/behind-proxies/) informs the configurable proxy hop count used by the API rate limits. Local testing uses direct access. Production proxy configuration must be verified before deployment; the counters are process-local.

### Email verification and password reset

- [Resend Send Email API](https://resend.com/docs/api-reference/emails/send-email) and [verified domains](https://resend.com/docs/dashboard/domains/introduction) inform the native HTTPS client and sender setup. Leonis sends email addresses and account links through Resend. Local tests capture delivery requests and do not verify DNS or inbox delivery.
- [OWASP Forgot Password Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html) informs generic recovery responses, expiry, single-use tokens and session invalidation. Account tokens are stored as hashes and sent only through email.

### Settings credential changes

- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html#changing-a-users-registered-email-address) informs password re-entry for credential changes and separate approval links for the current and proposed email. The active recovery address stays in place until both links are confirmed. Password changes rotate session credentials and clear outstanding recovery links.
