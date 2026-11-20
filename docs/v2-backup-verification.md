# Local release backup and rehearsal — 20 November 2026

The owner chose a local database export. The export, restore test and six-migration
rehearsal completed successfully. Neon data/schema and hosting settings were not
changed. Existing Neon `dev` was not reset or modified.

## Private artifacts

Files are retained in this checkout's **`.local-backups/`**, ignored by Git.
The directory has mode `0700`; the archive and verification files have mode
`0600`. These artifacts contain private data and must remain out of source control.

| Artifact | Purpose |
| --- | --- |
| `leonis-production-20261120.dump` | Verified custom-format application database archive, 22,470 bytes |
| `leonis-production-20261120.dump.sha256` | Archive integrity checksum |
| `restore-baseline.json` | Private record counts/content fingerprints and v1 migration baseline |
| `backup-verification.json` | Private restore/rehearsal results, tool version and image digest |

This backs up the application's **public schema**, including its seven v1 tables,
data, ID sequences and Prisma migration history. PostgreSQL role ownership/ACLs
are excluded for portability. External Cloudinary image files, hosting settings
and secrets are not part of this database archive; stored image URLs are retained.

## Export and restore

- Source: Leonis project `broad-snow-69619043`, named `production` branch,
  database `neondb`. The owner selected/authorized the source in Neon's temporary
  browser connection flow. No database password or `.env` file was accessed.
- Tools: official `postgres:18-alpine`, PostgreSQL client `18.7`, image digest
  `sha256:ff64c9e3bdf8e2120107d3559de8db314e8305f7e38c5105903c6295876738ff`.
- Export: `pg_dump` custom format, `--schema=public --no-owner --no-acl`, with
  verified TLS, read-only session options and a ten-second lock-wait timeout.
  The archive was finalized only after the export process exited successfully;
  its `PGDMP` signature and SHA-256 checksum were checked.
- Restore: `pg_restore --exit-on-error --single-transaction --no-owner --no-acl`
  into a disposable local PostgreSQL 18 database. Its empty default `public`
  schema was removed before restoring the archive's own schema definition.
- Isolation: Docker networking disabled, no published ports, private Unix socket
  beneath `.local-backups/`. No restored records were served over HTTP.

Restored counts matched the prior production audit:

| User | Pet | Meal | Weight | VetVisit | Reminder | Photo |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 5 | 20 | 2 | 3 | 2 | 4 | 1 |

All four restored August migration checksums matched the checked-in SQL.

## Fresh-copy migration rehearsal

A separate local database, `leonis_rehearsal_v2`, was cloned from the verified
`leonis_restore_v1` restore. With dotenv loading disabled and `DATABASE_URL`
explicitly targeting that **local Unix socket**, the following ran:

```bash
npx prisma migrate status  # Confirmed exactly six pending v2 migrations.
npx prisma migrate deploy
npx prisma migrate status  # Database schema is up to date.
```

Verification passed:

- All ten migrations completed; every recorded SQL checksum matches the repo.
- Content fingerprints across all seven original tables are unchanged, covering
  existing IDs, user ownership links and every original stored field. Only the
  newly added User fields were excluded from comparison.
- All seven legacy ID sequences retained their values and definitions.
- All migrated workspace preferences are valid; no account became admin
  automatically. Store-admin access still requires the deliberate grant command.

Both disposable local databases, their container/volume and the temporary socket
directory were removed after verification. The private archive and verification
files remain. The earlier PostgreSQL 17 smoke-test container was untouched.

## Remaining release checks

This verifies a point-in-time database export and migration/data-preservation
rehearsal. The owner subsequently confirmed that Render uses the production
endpoint matching this backup. Vercel settings, external uploads/chat after
release and the final deployed browser workflows still need verification.
Refresh the backup and record baseline if production changes before the upgrade.

See [database audit](v2-database-audit.md), [release guide](deploy-v2.md) and
[research register](../REFERENCES.md). No production migration or deployment has
been performed.
