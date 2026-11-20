# Leonis v2 production release — 20 November 2026

The owner resumed the held production release. The reviewed backend/frontend
candidates were deployed on the existing hosting; neither `main` was changed.
The owner has confirmed successful live login after resetting the production
account password. The remaining authenticated feature checks are still pending.

## Released versions

| Target | Released source | Deployment |
| --- | --- | --- |
| Render `pawpal-backend` | `458a6d5901caa6665728c68245df692763fb094b` | `dep-dbvvt33rjlhs73fu1n80`, live |
| Vercel `pawpal` | `bdc031dbbd817150a4f83737199afd162c7376e9` | `dpl_6tdh3MqhPWFiULQn7iKdXYWa1pnX`, READY, production |

Live frontend: <https://pawpal.umairiqbal.tech>.
API: <https://pawpal-backend-ekyt.onrender.com>.
Vercel's domain API confirms that the custom domain points to the new deployment.
The frontend production build was staged, inspected and promoted without rebuilding.

## Applied configuration

- Render remains Free, branch `version-two`, auto-deploy **Off**. Build:
  `npm ci --include=dev && npm run build`; start:
  `npx prisma migrate deploy && npm start`; HTTP health path `/health`.
  Build logs confirm Node `24.22.3`. Existing server secrets were retained.
- Vercel tracks production branch `version-two`, Node `24.x`, Vite, install
  `npm ci --include=dev`, build `npm run build`, output `dist`. Public API base
  remains `https://pawpal-backend-ekyt.onrender.com/api`.
- Custom-domain auto-assignment is **disabled**, including after promotion;
  Dashboard reload confirmed this persisted. Future frontend builds require
  deliberate promotion. Deployment authentication remains enabled as before.
- Store admin was granted only to the existing `umairiqbal` account. The guarded
  SQL updated exactly one row and returned `isStoreAdmin = true`.
- Checkout remains closed; delivery fee and parcel-weight limit remain unset.
  No production orders, listings, animal records or disposable accounts were created.

## Database verification

Before deployment, an isolated local restore produced aggregate fingerprints.
A production `BEGIN READ ONLY` comparison confirmed all fields/counts across
the seven legacy tables matched the verified backup, and the original four
migration checksums still matched the repository. The temporary comparison
container and its data volume were removed afterward.

The Render startup gate successfully applied the six pending v2 migrations to
the confirmed production endpoint `ep-empty-scene-b2rdh2v6` / `neondb`.
Post-migration read-only verification passed:

- All ten migration checksums match the checked-in SQL and all completed.
- All original records/fields, IDs and ownership links match backup fingerprints
  across User, Pet, Meal, Weight, VetVisit, Reminder and Photo. Newly added User
  fields are excluded from the original-field comparison.
- Workspace preferences are valid and no admin was promoted automatically.
- Closed checkout and unset delivery fields were confirmed before the named grant.

See [backup verification](v2-backup-verification.md) for recovery artifacts and
limits. The backup is the pre-release v1 snapshot, not a backup of later v2 writes.

## Hosted checks completed

- `/health` returns `200 {"status":"ok"}` with `Cache-Control: no-store`.
- Public store settings, product catalogue and listings return 200 through the
  correct production CORS origin. Catalogue/listings are empty on this database.
- A browser recheck on 20 November 2026 confirmed the public `/api/store/settings`
  response still reports `checkoutEnabled: false`, `standardFee: null` and
  `standardWeightLimitGrams: null`.
- Anonymous pet/workspace/admin-access requests are denied using the existing
  API's 400 response; authorization-header OPTIONS preflight returns 204.
- Browser store/marketplace requests complete with empty-state UI, with no CORS
  error. Marketplace hard reload works on the custom domain.
- 390 px Urdu/dark store and 320 px Urdu/light marketplace fit without horizontal
  overflow; heading direction is RTL. Language/theme were restored and viewport
  override cleared. Existing preview checks cover landing/signup as well.
- No Render error-level logs were returned from the post-live release window.

## Remaining verification

The owner confirmed that the production password reset succeeded and the new
password works on the live website. Development and production are separate
databases; the reset was run with a temporary production connection override
and dotenv disabled, without changing the local `.env` file or sharing secrets.
This confirms owner login, not independent agent verification of private features.
Private records, workspace switching, reports, admin UI and live AI still need
post-release browser verification. No credentials were requested in chat.
No dependency changes or paid hosting resources were added during release.

The build reported dependency audit warnings. A subsequent read-only
`npm audit --omit=dev` reports three high-severity package entries on one chain:
`prisma` → `@prisma/config` → `effect`. The underlying
[Effect template-literal regex advisory](https://github.com/advisories/GHSA-7589-6fvf-x4pw)
concerns denial of service when affected schemas decode untrusted input. No
direct Effect/TemplateLiteral use was found in handwritten Leonis sources;
the installed `@prisma/config` entry point uses Effect to validate local CLI
configuration and contains no `TemplateLiteral` reference. This static review
found no request path to the affected decoder in the inspected code. Full
transitive reachability remains unverified. npm's offered automatic fix is a
major Prisma downgrade. See the [dependency review](../REFERENCES.md#release-dependency-audit-follow-up)
for a proposed development check of a scoped Effect override, pending owner approval.

To change admin later in an authorized database context, grant the new existing
username with `node scripts/storeAdmin.js grant <new-username>`, verify access,
then run `node scripts/storeAdmin.js revoke umairiqbal`. Never copy credentials
into chat. Render Free has no interactive shell; use an approved database runner
or the confirmed Neon production SQL Editor for the equivalent guarded update.
