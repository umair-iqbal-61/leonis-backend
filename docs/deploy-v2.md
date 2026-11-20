# Deploy Leonis v2 on the existing hosting

Prepared 20 November 2026. The owner confirmed Render Free, and the Render
service settings and both Neon branches have now been inspected read-only.
See [the database audit](v2-database-audit.md): production has six pending v2
migrations; development has all ten applied. A [local backup, restore and fresh-copy
migration rehearsal](v2-backup-verification.md) now pass. The owner privately
confirmed Render's production database target. Vercel settings and the reviewed
publication steps remain outstanding.

## Targets and release order

Repository documentation identifies Vercel at `https://pawpal.umairiqbal.tech`,
Render at `https://pawpal-backend-ekyt.onrender.com`, and Neon PostgreSQL. Confirm
these are still the intended services before release. Keep both repositories on
`version-two`; deploying that branch does not require changing `main`.

1. Record the currently deployed frontend/backend commit IDs and hosting settings.
   Confirm the database target privately in the hosting dashboard; do not paste
   credentials into chat or commit them.
2. Establish a restorable database backup. Rehearse the pending migrations against
   a dedicated staging database copied from the current v1 schema/data, with
   sensitive data handled appropriately. Record user/animal counts and check
   existing logins, animal IDs, ownership and records before and after.
3. In that staging environment, run `npx prisma migrate status`. Existing August
   migrations must already match the v1 history. If history is missing/divergent,
   stop and investigate a baseline; do not reset the database, use `db push`, or
   mark migrations applied blindly. The old August password-column migration is
   destructive and must not be replayed against populated v1 accounts.
4. Verify the v2 staging API and frontend together, including the checks below.
5. After explicit approval for the production database migration and publication,
   deploy the backend first, then the frontend. Keep the old frontend available
   until the new API and migration verification pass.

`migrate deploy` applies all pending checked-in migrations, not only the newest
barn/workspace changes. Local isolated fixtures passed; they do not establish the
state of the live Neon database. Repository guardrails currently authorize agent
migration tests only on dedicated development databases.

## Render backend settings

### Existing service verified 20 November 2026

Source: the authenticated [service settings](https://dashboard.render.com/web/srv-da5ib3rtqb8s73ainuag/settings), environment variable **names only**, and latest successful deployment.

| Setting | Observed current value |
| --- | --- |
| Service | `pawpal-backend`, Free, Singapore |
| Source repository | `umair-iqbal-61/leonis-backend` |
| Branch / auto-deploy | `main` / On Commit |
| Live commit | `03d7b345f8b49357403c6de052d4a076e253a818` |
| Successful deployment | `dep-dbe8khbbc2fs73fviee0`, 24 October 2026 |
| Root directory | Unset (repository root) |
| Build command | `npm install && npx prisma generate` |
| Start command | `npm start` |
| Pre-deploy / HTTP health-check path | Unavailable on Free / unset |
| Explicit `NODE_VERSION` setting | Absent |

All six expected server variable names are configured; values remained masked.
There are no linked environment groups. The deployed source commit has no Node
engine declaration, `.node-version` or `.nvmrc`. Old deployment logs are outside
retention, so the actual running Node version is **not verified**. No setting
was changed, deployment triggered or database accessed during this inspection.

### Proposed v2 settings

| Setting | Value |
| --- | --- |
| Branch | `version-two` for this release |
| Runtime | Node 24; `package.json` specifies `24.x` |
| Build command | `npm ci --include=dev && npm run build` |
| Start command | `npx prisma migrate deploy && npm start`, only after release approval |
| Optional HTTP health-check path | `/health` |

Check for an existing Render `NODE_VERSION` setting or `.node-version`/`.nvmrc`
override: those take precedence over `package.json`. The build includes locked
development tools because Prisma CLI is a dev dependency. `npm run build`
generates the ignored Prisma client; it does not migrate the database. Keep
Render's supplied `PORT`; the server uses it automatically.

Existing server-only settings: `DATABASE_URL`, `JWT_SECRET`,
`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`,
`GROQ_API_KEY`. Verify their presence privately; retain the existing JWT secret
to preserve valid sessions. Never expose them as frontend `VITE_*` values.

Migration commands, run only in the confirmed target's hosted release context:

```bash
npx prisma migrate status
npx prisma migrate deploy
npx prisma migrate status
```

Render supports a separate pre-deploy command on paid services. Where available,
use `npx prisma migrate deploy` there with `npm start` as the start command. For
the confirmed Free service, the proposed release method is the explicit start
command below. Database changes stay out of the build command. This has not been
configured on the live service and requires review/approval before use.

### Confirmed free-plan path

The owner confirmed **Free** on 20 November 2026. No paid pre-deploy command or
Render shell is available on that service. Proposed start command:

```bash
npx prisma migrate deploy && npm start
```

It uses Render's existing server-only database configuration, applies pending
checked-in migrations, and starts the API only if migration succeeds. It runs on
each service start; once all migrations are applied, the migration step has
nothing pending. Future changes must still be reviewed before manual deploys.
This is a Leonis engineering choice based on Prisma's documented migrate-before-
start pattern and Render's configurable start command; it is not a separate
Render pre-deploy phase. Local `npm start` remains unchanged and never migrates.

The existing service is linked to `main` with On Commit auto-deploy. During the
approved release, disable auto-deploy before changing its linked branch or
commands. Once settings, backup and source commits are reviewed, manually deploy
the v2 commit; its start command applies the six pending migrations before the
API listens. Then verify migration logs and application readiness before releasing
the frontend. Do not push to `main`. The owner has privately confirmed the Neon
production target; its backup and fresh-copy rehearsal are verified. No hosting
setting has been changed yet.

Use [v2-database-preflight.sql](v2-database-preflight.sql) in the confirmed Neon
database's SQL Editor to inspect table names, migration names/checksums/status
and aggregate v1 record counts inside a read-only transaction. It does not read
individual account/animal records or change data. It ran successfully against
the named production branch on 20 November 2026; a shorter equivalent checked
development. All ten migration checksums match the repository; only four are
applied on production. If later checks find missing/unfinished history, stop and
investigate. Refresh the baseline before any production migration.

For rehearsal, a dedicated Neon child branch can isolate migration writes from
its parent. Confirm the actual project's plan/branch limits and selected parent
before creating one. Branching is not evidence that a restorable release backup
exists; separately confirm a recovery option and its usable retention window.

A GitHub Actions manual-dispatch workflow would need to exist on the default
branch. The proposed Free-service start gate avoids requiring a new CI workflow,
copying database credentials to CI or changing `main`/the default branch. Neither
repository has a remote `version-two` branch yet, verified through GitHub on
20 November 2026. Inspect Vercel's production-branch behavior before publishing
the frontend branch; keep Render auto-deploy off for the controlled release.

`GET /health` returns `200 {"status":"ok"}` without authentication or database
queries. It checks process liveness only; database, AI and storage readiness
require the separate smoke checks below. Existing CORS accepts only
`https://pawpal.umairiqbal.tech` and `http://localhost:5173`; a different staging
frontend origin needs an explicit allowlist change before browser testing.

## Vercel frontend settings

| Setting | Value |
| --- | --- |
| Framework preset | Vite |
| Release/production branch | `version-two`, after approval |
| Node version | 24.x (also declared in `package.json`) |
| Install command | `npm ci --include=dev` |
| Build command | `npm run build` |
| Output directory | `dist` |
| Public build variable | `VITE_API_URL=https://pawpal-backend-ekyt.onrender.com/api` |

For staging, use the staging API base instead. Vite embeds this public value at
build time; changing it requires a new build. The existing `vercel.json` rewrite
supports SPA routes, including `/livestock`, `/barns`, and `/store/orders`.

## Verification and store setup

- Confirm `/health`, then use an existing account to check records, saved
  workspace choice, switching, cattle/barn history and quality reports.
- On staging, verify signup choices and owner isolation with disposable users;
  exercise marketplace and store buyer/admin flows, standard delivery, revised
  quotes and buyer acceptance, cancellation/restored stock, and phone tracking.
- Check live chat and uploads with the correct staging service credentials.
  Inspect 320–390 px layouts, dark mode, Urdu RTL, English/Urdu PDFs and hard
  reloads of nested routes. Avoid real COD requests during production smoke tests.
- Store checkout starts closed and delivery settings start unset on a fresh
  database. Confirm actual production settings; never copy dummy test rates.
  Enable checkout only after real delivery fees and parcel limits are reviewed.
- In an approved administrative context, grant the intended existing account:
  `node scripts/storeAdmin.js grant umairiqbal`. To change admin, grant the new
  existing username, verify access, then run
  `node scripts/storeAdmin.js revoke umairiqbal`. A username alone never grants
  rights, and this command changes the selected database.

If deployment fails, keep the previous frontend/API release available. Reverting
application code does not revert Prisma migrations or preserve writes made after
a database restore point. Do not run destructive down-migrations or restore over
new orders/records as an automatic rollback. Diagnose and use a reviewed forward
fix or an explicitly approved recovery plan.

## Sources

Official Render, Vercel and Prisma documentation checked 20 November 2026; direct
links and limitations are recorded in both repositories' `REFERENCES.md` files.
