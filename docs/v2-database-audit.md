# Neon release preflight — 20 November 2026

Authenticated inspection after owner authorization. Only metadata and aggregate
counts were queried, inside `BEGIN READ ONLY`; both branches returned
`transaction_read_only = on`. No migration, restore, reset, snapshot or branch
creation was performed. SQL Editor query history may retain these metadata-only
queries; application data and schema were unchanged.

## Confirmed project and branches

Project: **Leonis**, `broad-snow-69619043`, Free plan, AWS Frankfurt.
Database/schema: `neondb` / `public`; production reported PostgreSQL
`18.7 (84da7d8)`.

| Branch | ID | Primary compute endpoint ID | Observed state |
| --- | --- | --- | --- |
| `production` (default) | `br-frosty-tooth-b2apugay` | `ep-empty-scene-b2rdh2v6` | v1 schema; 4 completed migrations |
| `dev` | `br-frosty-rain-b289n8o9` | `ep-misty-butterfly-b2d3y5qh` | All 10 repository migrations completed |

`dev` is a child of `production`, created 17 November 2026. It currently contains
5 accounts and 22 animal profiles. Do not reset it for rehearsal: it contains
the owner's existing development work.

**Target limitation:** the Render `DATABASE_URL` value remained masked. The
Neon branch names alone do not prove which database Render currently uses.
Before release, the owner must privately confirm that Render's URL targets
`ep-empty-scene-b2rdh2v6` (or its pooled hostname) if `production` is intended.
No connection string or credential needs to be shared.

## Production aggregate baseline

| Record type | Count |
| --- | ---: |
| User | 5 |
| Pet | 20 |
| Meal | 2 |
| Weight | 3 |
| VetVisit | 2 |
| Reminder | 4 |
| Photo | 1 |

The public schema contains those seven tables and `_prisma_migrations`. This is
a point-in-time baseline; counts must be refreshed around the actual release.
Counts alone do not prove that individual IDs, ownership or field values survive
an upgrade. Verify those separately during a fresh-copy rehearsal.

## Applied migration checksums

All four production migrations have a completion timestamp, no rollback
timestamp and one applied step. Their SHA-256 checksums match the repository.
Development's six additional migrations also have completion timestamps, no
rollback timestamps and matching checked-in SQL checksums.

| Migration | SHA-256 | Applied branches |
| --- | --- | --- |
| `20260815113550_init` | `14ed60381481ed93e1a10437c6b7a675b2ee35069037a9273ff1955709e7ec16` | production, dev |
| `20260816065339_rename_password_field` | `2955625703014800239504421563fe446c2bc564e789cea7c1d6cb6a74f06311` | production, dev |
| `20260823053539_add_pet_avatar_url` | `60cbad680baa42a1d59d565463a5c62900a66700383897fcf968c3ac6b353cb4` | production, dev |
| `20260823054107` | `34a386ff7aa3559007314477f2359989879241ee8c053bbecdcdc569a1f48def` | production, dev |
| `20261115000000_record_quality` | `e922beedf9c872ad399ca0c2e66b5e2392921082eeca61eeed3d33dff3b7dd8a` | dev |
| `20261118000000_milking_session` | `2bd68acd87c9020d005540ab1ac5ffee773afe24ecf986b9c657a4549ca9d55a` | dev |
| `20261118010000_marketplace` | `f15d6ebae00d974d121fbdba9f276700a87d6fbbc447a0201d9339fc79037ef7` | dev |
| `20261119000000_store` | `bccbaef32d291b7007f703e9e996416be86b3ff8d146e7ea3e72cae0a095e2d1` | dev |
| `20261119010000_barns` | `2f61b851ab66c6cb348b364dcb6fd97acacf1c5149e1db8b0d690e69d468bf60` | dev |
| `20261119020000_workspaces` | `79ca4da774704fa4a87773e97a0b74033e79cfca03ee19310c74216b584a4f01` | dev |

Thus **six v2 migrations are pending on the named production branch**. The old
August password-column migration is already recorded as applied and must not be
replayed. Matching checksums are useful history evidence, not a schema-drift
check or proof of a completed restore rehearsal.

## Recovery and next steps

The production Backup & Restore screen showed a **six-hour history window**, no
snapshots and no backup schedule. A restorable release backup has not yet been
created or verified.

1. Choose a local PostgreSQL export or a Neon snapshot. Use PostgreSQL 18 (or
   newer compatible) client tools for a `pg_dump` backup; only Docker is
   currently installed locally. Keep any export private, outside version control,
   and verify it by restoring into a disposable database. Do not print its data.
2. Rehearse the six pending migrations on a fresh dedicated copy of production;
   preserve existing `dev`. Verify original IDs, ownership and record contents,
   then exercise v2 against that copy.
3. Confirm the Render target privately, inspect Vercel settings, and finalize the
   controlled migration method supported by Render Free. No runner or production
   migration command has been configured automatically.
4. Present the specific release changes before production migration/deployment.
   Refresh the backup and baseline if production receives writes in the meantime.

## Evidence

- [Production overview](https://console.neon.tech/app/projects/broad-snow-69619043/branches/br-frosty-tooth-b2apugay), [recovery screen](https://console.neon.tech/app/projects/broad-snow-69619043/branches/br-frosty-tooth-b2apugay/restore), and [SQL Editor](https://console.neon.tech/app/projects/broad-snow-69619043/branches/br-frosty-tooth-b2apugay/sql-editor).
- [Development overview](https://console.neon.tech/app/projects/broad-snow-69619043/branches/br-frosty-rain-b289n8o9) and its SQL Editor metadata query.
- [Reusable read-only preflight](v2-database-preflight.sql), local SHA-256 comparison of [checked-in migrations](../prisma/migrations/), and [research register](../REFERENCES.md).
