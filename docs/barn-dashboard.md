# Barn dashboard: local setup and behavior

Implemented on `version-two` using the provisional [Pakistan research specification](barn-dashboard-research.md). Sources and their limitations are indexed in [REFERENCES.md](../REFERENCES.md). No study prices, milk rates or clinical recommendations are seeded.

## Setup

From the backend, against a confirmed development database:

```bash
npx prisma migrate deploy
npx prisma generate
npm run dev
```

The additive migration is `20261119010000_barns`. Existing users and animal IDs are retained. Start the frontend using its documented localhost command, sign in, choose the Livestock workspace, and open `/barns`. A pet-only account opening that URL gets an explicit enable-workspace action. Every account manages only its own barns; store-admin permission is unrelated. Apply the subsequent workspace migration as described in [workspaces](workspaces.md).

## Workflow

1. Create a barn with name, optional location and notes.
2. Add existing dairy-cattle profiles under Cattle. A cow can have only one current barn assignment. Assigning it to another barn ends the previous interval and opens a new one.
3. Enter milk/animal sales and costs in Financial ledger. Choose an animal for direct entries or leave the entry at barn level for pooled income/shared costs. Animal purchases/sales require an animal profile with assignment history in that barn.
4. Record each actual receipt/payment separately. Unpaid and part-paid entries retain outstanding amounts. Payment dates may differ from agreement dates; no money is inferred from production, marketplace listings or store orders.
5. Select report dates, review shared versus direct figures and save an English/Urdu PDF using the browser print dialog.

Transfer and end dates are **exclusive for the old barn**: a transfer on January 10 assigns January 10 production to the new barn. Dates use the Pakistan calendar (Asia/Karachi), without time-of-day allocation. Historical financial entries retain their explicit original barn. Assignments are appended/ended; this release does not provide retrospective interval editing. Check dates before submitting.

A sale entry does not automatically end a cattle assignment; physical departure and financial agreement dates can differ. End the assignment explicitly when appropriate.

Archive a barn only after transferring/ending its current cattle assignments. Existing entries can still be corrected or settled, but new entries and assignments are blocked until unarchived. Barn deletion is not provided, preserving financial history.

## Financial and production rules

- Money is stored as PostgreSQL decimals and summed with integer minor units. Monetary inputs accept at most two decimal places; milk-sale/feed quantities accept up to three. Existing milk-production records retain their supported four-decimal precision in reports.
- Recorded operating income/costs exclude animal acquisition/disposal and equipment, which are shown separately. No depreciation, tax, financing, animal valuation or full net-profit calculation is provided.
- Per-animal margins use only direct entries and exclude shared costs/pooled sales. Shared records appear separately; no automatic allocation is made.
- Missing operating inputs show No records; a margin is unknown if either operating-income or operating-cost records are absent. Empty production is unknown; a recorded valid zero yield remains zero.
- Cash movement uses payment dates in the selected range, including settlements of older transactions. Outstanding receivables/payables use entries and settlements through the selected end date, irrespective of the range start.
- Production follows dated barn membership and excludes missing/invalid values and active unresolved quality findings affecting milk quantity/date/type. No source data is changed by a report. Milk sold is independent from milk produced.
- Amount reductions below paid totals are rejected. Income/expense direction cannot change while payment records exist. Remove payments explicitly before deleting a paid entry; payment removal adjusts the recorded outstanding amount.
- Version checks guard stale financial edits. Barn-scoped transaction locks prevent concurrent overpayments; request UUIDs make repeated creates/payments/assignments idempotent.
- If the owner deletes an animal through the existing pet API, its financial entries and membership snapshots retain the animal name/reference. Original care/production records follow the existing pet-deletion behavior; they are not copied into the financial ledger.

## API

All routes require the existing JWT and scope access to the signed-in owner.

- `GET/POST /api/barns`: list or create (`name`, optional `location`/`notes`, UUID-v4 `requestId`).
- `GET/PATCH /api/barns/:id`: detail/settings; updates require metadata, boolean `archived`, and `expectedVersion`.
- `GET /api/barns/animals`: owner's dairy-cattle choices and their current barn.
- `POST /api/barns/:id/assignments`: `petId`, `startedOn`, UUID-v4 `requestId`.
- `POST /api/barns/:id/memberships/:membershipId/end`: `endedOn`.
- `GET /api/barns/:id/entries?page=1&animalReference=123`: ledger, 20/page, all dates. Optional animal reference filters direct entries.
- `POST /api/barns/:id/entries`: `occurredOn`, `category`, positive PKR `amount`, `description`, optional `petId` and `receipt`, and UUID-v4 `requestId`. `MILK_SALE` requires positive `quantity` in litres; `FEED` optionally accepts kg quantity. Units are explicit, not inferred from local measures.
- `PATCH/DELETE /api/barns/:id/entries/:entryId`: updates take the entry fields plus `expectedVersion`; deletion takes `expectedVersion` and requires no remaining payments. A deleted animal's existing snapshot can be retained on edit with `petId: null` and `keepDeletedAnimal: true`.
- `POST /api/barns/:id/entries/:entryId/payments`: positive `amount`, `paidOn`, optional `note`, UUID-v4 `requestId`.
- `DELETE /api/barns/:id/entries/:entryId/payments/:paymentId`: `expectedVersion` of the parent entry.
- `GET /api/barns/:id/report?from=YYYY-MM-DD&to=YYYY-MM-DD`: operating/shared/animal figures, dated cash movements, outstanding balances and qualified milk totals. Defaults to the current Pakistan month through today.

Categories: `MILK_SALE`, `ANIMAL_SALE`, `OTHER_INCOME`, `ANIMAL_PURCHASE`, `FEED`, `VET`, `BREEDING`, `TRANSPORT`, `LABOUR`, `UTILITIES`, `RENT`, `MAINTENANCE`, `EQUIPMENT`, `OTHER_EXPENSE`.

## Verification

```bash
node --test test/barn.test.js
```

The opt-in `test/barn.integration.test.js` requires `LEONIS_TEST_DATABASE_URL` pointing to the disposable localhost **leonis_smoke** database and `LEONIS_TEST_API_URL=http://localhost:7462/api`. Start a separate migrated backend on port 7462 with that database. The test creates and removes only its own fixtures and checks pre-existing animal IDs remain present. Never target a production database.
