# Leonis v2 checkpoint — 20 November 2026

## Implemented

- Additive cattle milk, breeding and calving records; existing animal IDs and ownership retained.
- Record-quality findings, owner review decisions, repeat checks and PDF reports.
- English/Urdu text, RTL, mobile layouts and Tailwind-first shared styling.
- Initial cited species/breed guidance and server-scoped AI context filtering. Guidance is a small curated collection, not a comprehensive breed knowledge base.
- Animal listings with drafts, deliberate public publishing, private-record separation, and phone/WhatsApp contact.
- Single-seller catalogue, cart, COD requests, delivery quotes requiring buyer acceptance, inventory reservation and admin controls.
- Provisional multi-barn dashboard: cattle assignment/transfer history, milk/animal sales, direct/shared costs, partial payments, and dated English/Urdu reports. Recorded operating margins and cash movement are distinguished from net profit. Agent verification and subsequent owner barn-workflow review passed.
- Workspace update, 20 November 2026: one login with Pets/Livestock/both signup choices, saved workspace preferences, a switcher and separated profile navigation. Existing accounts are backfilled without changing records; commerce remains shared. Agent checks and owner workflow review passed.

The owner confirmed marketplace operation, store administration, standard and heavy-order workflows, cancellation stock returns, and order tracking in a phone browser. Earlier browser checks used real isolated PostgreSQL/API operations, with external Cloudinary storage simulated. Live AI and uploads were separately checked by the owner.

## Verification at this checkpoint

Frontend lint and production build pass. Backend rule, duplicate, species-guide, metric, marketplace and store unit tests pass. Earlier isolated marketplace/store integration checks covered ownership, admin permissions, stock concurrency, idempotent requests, quote revisions and cancellation. Mobile, dark mode and Urdu RTL were exercised in browser workflows.

The 22-case synthetic challenge evaluation currently produces:

| Configuration | Precision | Recall | F1 | Negative-scenario false-positive rate |
| --- | ---: | ---: | ---: | ---: |
| Field validation | 100% | 46.7% | 63.6% | 0/7 |
| Field + cross-record rules | 93.8% | 100% | 96.8% | 1/7 |

The remaining challenge-set false positive concerns legitimate equal milk yields with unknown sessions. Known different sessions can distinguish these entries. These fixtures have informed development; they are not an independently reviewed, blinded holdout and do not establish real-world or clinical accuracy. See `benchmark/README.md` for matching definitions, per-rule output and limitations.

## Deferred decisions and work

- Barn financial dashboard: research-led provisional implementation and workspace navigation passed owner review. See `docs/barn-dashboard.md` and `docs/barn-dashboard-research.md`. Interviews remain later validation.
- External labeling and fresh evaluation data remain needed to strengthen the evidence for record quality.
- Broader cited guidance can expand the initial knowledge collection after source review.
- Multiple store sellers, payouts, commissions, mixed-seller checkout and online payments remain later work by owner choice.

## Release preparation after the barn milestone

**Current release status:** the owner resumed the held release on 20 November
2026. The six production migrations and both hosting deployments succeeded.
Original records match the backup, `umairiqbal` has the intended store-admin
role, checkout remains closed, and public mobile/API/CORS checks pass. Future
publication is manual on both hosts. The owner confirmed live login after a
production password reset. The signed-in follow-up confirmed store admin,
My orders, switching between Pets and Livestock, and workspace persistence. The
original Pets-only preference was restored. A separate existing account with
records confirmed the pet profile and history, localized quality report views
and a live AI reply grounded in saved records. English and Urdu PDF files remain
unverified because the in-app browser could not complete browser printing.
See [release results](v2-release-results.md) for exact deployed commits
and verification limits. The preparation record below describes the earlier state.

The local runtime/build configuration and a concrete release sequence are now
documented in [deploy-v2.md](deploy-v2.md). No production deployment or migration
has been performed. The owner confirmed Render Free on 20 November 2026; a
migration-before-start gate is proposed, pending approval. Read-only Render inspection verified the live
`main` deployment, build/start commands, On Commit auto-deploy and configured
variable names; the actual running Node version is unverified because old logs
expired. [Neon inspection](v2-database-audit.md) verified the named production
branch's four completed v1 migrations and development's ten completed migrations,
with matching checksums. Production has a six-hour recovery window and no
snapshots. A [local database export, restore and fresh-copy migration rehearsal](v2-backup-verification.md)
passed: original records/ID sequences are preserved and all ten migrations match
the repository. The owner privately confirmed Render's production endpoint.
Vercel inspection now confirms the `pawpal` Vite project, Node 24, Production
tracking `main`, default build settings and the correct public API base. Provider
access is verified for both hosts. Both `version-two` branches are pushed, and
the protected frontend preview is READY. Landing/signup, 320/390 px layouts,
light/dark themes, English/Urdu RTL and direct-route reloads passed; preview API
workflows were not tested because production CORS excludes the preview origin.
The [release review](v2-production-release-review.md) freezes exact candidate
commits and the remaining production actions. Production release approval and
final hosted checks remain outstanding. No Neon
application data/schema or production settings/deployments have been changed.

1. Complete and verify the provisional barn milestone, then confirm the existing v1 frontend, backend and database targets before publishing or applying migrations outside isolated tests. The owner chose to retain v1 hosting.
2. Configure the actual frontend API base including `/api`, backend CORS origin, service credentials and store-admin role without committing secrets.
3. Keep checkout closed until actual nationwide delivery rates and parcel limits are configured; do not reuse test rates.
4. Run migrated-database and browser smoke tests on staging, including buyer/admin separation and live uploads/AI.
5. Review pending COD requests operationally: stock is reserved until cancellation or fulfillment; automatic request expiry, courier tracking and notifications are not implemented.

Order tracking currently means order status in My orders. It does not include courier GPS, SMS, or automatic refresh.
