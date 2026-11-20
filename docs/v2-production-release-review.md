# Leonis v2 production release review

Prepared 20 November 2026. The owner subsequently resumed the held release;
the frozen candidates below are now deployed. See [release results](v2-release-results.md)
for executed actions, verification and remaining owner sign-in. The checklist
below preserves the reviewed sequence and its original evidence.

## Frozen sources and pre-release production

| Repository | Published `version-two` candidate | Pre-release production commit |
| --- | --- | --- |
| Frontend | `bdc031dbbd817150a4f83737199afd162c7376e9` | `fab97adeafb6a2220430e626d1e0f67e44ac7db9` |
| Backend | `458a6d5901caa6665728c68245df692763fb094b` | `03d7b345f8b49357403c6de052d4a076e253a818` |

Both candidates are pushed. Later documentation edits in this working tree are
outside these frozen candidates. Recheck remote hashes before release and stop
if application code or migration SQL has changed. Neither `main` is changed.

Existing targets: Vercel `pawpal` in `umair-iqbal-projects`, Render
`pawpal-backend` (`srv-da5ib3rtqb8s73ainuag`, Free), Neon Leonis
`production` / `neondb` (endpoint `ep-empty-scene-b2rdh2v6`).

## Completed evidence

- [Local export, isolated restore and six-migration rehearsal](v2-backup-verification.md)
  pass, with original records, IDs, ownership and sequences preserved.
- [Protected preview](https://pawpal-36yl9p5ci-umair-iqbal-projects.vercel.app),
  deployment `dpl_5czEmqdRv8BbqxGwZNBu2aM9ztAc`, is READY for the frontend
  candidate above. Landing/signup and reloads pass at 320/390 px in English/Urdu,
  RTL and light/dark themes. No signup, order or API write was performed.
- Preview uses the public production API base; its origin is outside production
  CORS. This establishes frontend build/layout behavior, not hosted API workflows.
- Render's live deployment is still `dep-dbe8khbbc2fs73fviee0`; the frontend custom
  domain still points to `dpl_2oUtCasqWLjmGRj19ND6fE1WxxJn`. Production is unchanged.
- The requested existing admin username `umairiqbal` appears exactly once in the
  private backup. No role has been granted on production.

## Approved-release sequence to execute

1. Recheck source hashes and production migration history/baseline. Refresh the
   private local export if production changed after the verified backup; repeat
   restore/migration verification for a refreshed archive before proceeding.
2. Disable Render auto-deploy. Set branch `version-two`, build
   `npm ci --include=dev && npm run build`, start
   `npx prisma migrate deploy && npm start`, health path `/health`. Keep Free
   compute and existing server secrets. Manually deploy the frozen backend.
3. Confirm all six pending migrations complete, all ten checksums match and the
   backend is live before releasing the frontend. Verify legacy record counts,
   ownership and workspace backfill read-only; `/health` alone checks no database.
4. Grant store admin only to the existing `umairiqbal` account using the guarded
   SQL below in the confirmed production SQL Editor. No new account is created.
5. Disable Vercel custom-domain auto-assignment, track `version-two`, retain
   Node 24/Vite and the existing public API base. Set install
   `npm ci --include=dev`, build `npm run build`, output `dist`. Stage a production
   deployment of the frozen frontend commit, inspect it, then promote that build
   to `pawpal.umairiqbal.tech`. Verify domains and keep future releases manual.
6. Verify hosted login/records, workspace navigation, reports, catalogue/tracking
   and mobile/theme/Urdu layouts. Use existing accounts; avoid disposable
   production records, orders or uploads. Live AI checks may use the existing
   conversation flow. Keep checkout closed and delivery fees/limits unset.

No paid upgrade, dependency change, secret change, data reset or automatic
database restore is included. Code rollback does not undo schema changes or
recover writes made after a backup. Stop and diagnose a failed migration/release.

## Guarded admin grant (proposed; not executed)

```sql
BEGIN;
SET LOCAL statement_timeout = '10s';
DO $$
BEGIN
  IF (SELECT count(*) FROM public."User" WHERE username = 'umairiqbal') <> 1 THEN
    RAISE EXCEPTION 'Expected existing admin account absent or ambiguous';
  END IF;
END $$;
UPDATE public."User" SET "isStoreAdmin" = true
WHERE username = 'umairiqbal'
RETURNING username, "isStoreAdmin";
COMMIT;
```

To change admin later, grant the new existing username, verify its admin access,
then revoke `umairiqbal`. The supported CLI in an authorized database context is
`node scripts/storeAdmin.js grant <new-username>` followed by
`node scripts/storeAdmin.js revoke umairiqbal`; never copy credentials into chat.

## Approval boundary

[AGENTS.md](../AGENTS.md) says: “Run migrations and smoke tests only against a
dedicated development database.” Production migration requires the owner's
explicit exception for this release. Requested approval covers the six pending
production migrations, hosting settings/publication, the named admin grant and
the read-only hosted checks above. It does not change that standing guardrail.
