# Leonis v2 checkpoint — 19 November 2026

## Implemented

- Additive cattle milk, breeding and calving records; existing animal IDs and ownership retained.
- Record-quality findings, owner review decisions, repeat checks and PDF reports.
- English/Urdu text, RTL, mobile layouts and Tailwind-first shared styling.
- Initial cited species/breed guidance and server-scoped AI context filtering. Guidance is a small curated collection, not a comprehensive breed knowledge base.
- Animal listings with drafts, deliberate public publishing, private-record separation, and phone/WhatsApp contact.
- Single-seller catalogue, cart, COD requests, delivery quotes requiring buyer acceptance, inventory reservation and admin controls.

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

- Barn financial dashboard: remains deferred until three owner/dealer interviews can inform fields. Prompts are in `docs/barn-dashboard-interviews.md`; PKR purchase/feed/vet/transport/sale fields are not finalized.
- External labeling and fresh evaluation data remain needed to strengthen the evidence for record quality.
- Broader cited guidance can expand the initial knowledge collection after source review.
- Multiple store sellers, payouts, commissions, mixed-seller checkout and online payments remain later work by owner choice.

## Release preparation next

1. Choose/confirm the staging frontend, backend and development-database targets before publishing or applying migrations outside isolated tests.
2. Configure the actual frontend API base including `/api`, backend CORS origin, service credentials and store-admin role without committing secrets.
3. Keep checkout closed until actual nationwide delivery rates and parcel limits are configured; do not reuse test rates.
4. Run migrated-database and browser smoke tests on staging, including buyer/admin separation and live uploads/AI.
5. Review pending COD requests operationally: stock is reserved until cancellation or fulfillment; automatic request expiry, courier tracking and notifications are not implemented.

Order tracking currently means order status in My orders. It does not include courier GPS, SMS, or automatic refresh.
