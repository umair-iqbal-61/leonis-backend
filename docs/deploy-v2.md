# Deploy Leonis v2 on the existing hosting

Prepared 20 November 2026. The owner confirmed Render Free. Production service
settings and database migration history have not been inspected. The available
browser currently requires Render sign-in.

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

| Setting | Value |
| --- | --- |
| Branch | `version-two` for this release |
| Runtime | Node 24; `package.json` specifies `24.x` |
| Build command | `npm ci --include=dev && npm run build` |
| Start command | `npm start` |
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
use `npx prisma migrate deploy` there. On a free service, arrange a controlled
CI/release job with the same checked-in migrations and securely supplied target
configuration before starting the new API. Do not assume a paid shell/pre-deploy
feature exists, and do not silently add database changes to the build command.
The chosen production migration method remains a release decision.

### Confirmed free-plan path

The owner confirmed **Free** on 20 November 2026. No paid pre-deploy command or
Render shell is available on that service. Keep the build/start commands above;
run migrations separately in the approved release context before publishing v2.

Next, inspect the existing service's repository, deployed commit, branch,
auto-deploy mode, Node override, build and start commands. Do not change the
linked branch or trigger a deployment while gathering these details. Then
privately confirm the Neon target, restore point and migration history before
choosing and configuring the release runner.

A GitHub Actions manual-dispatch workflow must exist on the repository's default
branch to be triggered. Adding it only to `version-two` does not establish a
working release job. No workflow, default-branch change or change to `main` has
been made. The runner must be settled before attempting the production migration.

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
