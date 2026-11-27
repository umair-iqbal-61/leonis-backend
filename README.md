# Leonis Backend

Express/Prisma REST API powering **Leonis** (formerly PawPal), an AI-powered pet care app. Built as a from-scratch replacement for an original Supabase backend — custom auth, nested resource routes, Cloudinary-backed storage, and a Groq LLM proxy for AI chat.

**Live API:** `https://pawpal-backend-ekyt.onrender.com`
**Frontend:** [pawpal.umairiqbal.tech](https://pawpal.umairiqbal.tech)

> Free-tier hosting: the API spins down after 15 minutes of inactivity. First request after idle can take 30–50 seconds to wake up.

## Stack

- **Runtime:** Node.js 24, Express 5 (ESM)
- **Database:** PostgreSQL via [Neon](https://neon.tech), accessed through Prisma 7 with the `@prisma/adapter-pg` driver adapter
- **Auth:** JWT + bcrypt (no OAuth)
- **Storage:** Cloudinary (photo gallery + pet avatars)
- **AI:** Groq (`openai/gpt-oss-20b`) as a server-side chat proxy
- **Deployment:** Render

## Architecture

Resources are nested under their owning pet, scoped and ownership-checked via middleware, rather than trusting client-supplied IDs:

```
/api/auth/register, /api/auth/login              — public
/api/pets                                         — CRUD, scoped to the logged-in user
/api/pets/:petId/meals                            — nested, ownership-verified
/api/pets/:petId/weights
/api/pets/:petId/vetvisits
/api/pets/:petId/reminders
/api/pets/:petId/photos
/api/pets/:petId/avatar
/api/pets/:petId/chat                             — Groq proxy, pet-context aware
/api/reminders                                    — flat, cross-pet (for the notification poller)
```

**Middleware chain:** `validateToken` (verifies JWT, attaches `req.user`) → `verifyPetOwnership` (confirms the pet belongs to the requesting user, attaches `req.pet`) → route handler.

## Data model

`User → Pet → { Meal, Weight, VetVisit, Reminder, Photo }`, all cascade-deleted with their parent pet. See `prisma/schema.prisma` for full field definitions.

## Local setup

```bash
npm ci
npm run build
```

Create a `.env` with:

```
DATABASE_URL=
JWT_SECRET=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
GROQ_API_KEY=
PORT=7461
```

Signups default to 10 requests per client IP per 15 minutes. Sign-in defaults to
10 requests per client IP and username in the same window. These counters are
process-local. Before deploying behind a reverse proxy, verify the hop count and
set `AUTH_TRUST_PROXY_HOPS` accordingly. Leave it unset for direct local access.

### Account email and recovery

New signups require email verification once account email is configured. Users
still log in with their usernames. Existing accounts can sign in normally and add
a recovery address from **Account email**. Users who have never verified an email
cannot use self-service recovery.

1. Verify `auth.umairiqbal.tech` in Resend using its generated DNS records.
2. Create a sending-only API key for the verified domain. Keep the key in backend
   hosting secrets. Set `RESEND_API_KEY` on the backend only.
3. Set `ACCOUNT_EMAIL_FROM` to `Leonis <accounts@auth.umairiqbal.tech>` and
   `ACCOUNT_EMAIL_ORIGIN` to `https://pawpal.umairiqbal.tech`. Keep Resend click
   tracking disabled for these account links.
4. Apply the account email migration and release the frontend and backend with
   sending settings unset. Enable the three settings after both releases are
   ready, then verify signup and recovery with an authorized test account.

Verification links last 24 hours and require the account password. Reset links
last 30 minutes, are single-use, and invalidate earlier sessions after a password
change. Keep the existing username and account IDs when linking an address.

With `DATABASE_URL` configured for a dedicated development database, apply the
checked-in migrations, then start dev:

```bash
npx prisma migrate deploy
npm run dev
```

## Scripts

| Command | Purpose |
|---|---|
| `npm run build` | Generate the Prisma client (no database changes) |
| `npm run dev` | Start with nodemon (local dev) |
| `npm start` | Start with plain `node` (production) |

See [the v2 deployment guide](docs/deploy-v2.md) before publishing to the existing
Render/Vercel services. `GET /health` is a public liveness endpoint only; it does
not check database connectivity or external integrations.

## Notable build decisions

- **Nested over flat routing** for sub-resources: a Meal/Weight/VetVisit/Reminder/Photo only ever exists in the context of one pet, so ownership is checked once per request via middleware.
- **One deliberate exception:** `/api/reminders` is flat — it backs a background check across *all* of a user's pets, which the nested pattern can't express without an N+1 request pattern.
- **Dates/times** (vet visits, reminders) are explicitly parsed and anchored to UTC server-side to avoid timezone drift between client input and stored values.
- **Pet avatars** are a single field on `Pet` (`avatarUrl`), separate from the `Photo` gallery — one current avatar, not a history.

## Known limitations

- Response shapes aren't fully standardized across all routes yet (`{ data }` vs `{ message, data }`).
- Replaced Cloudinary assets (old avatars, deleted photos) aren't cleaned up yet — no soft-delete/retention policy.
- PATCH (edit) routes exist for Meal/Weight/VetVisit/Reminder but have no frontend UI yet.


## Marketplace API

Apply the additive `20261118010000_marketplace` migration to your dedicated development database, then generate the Prisma client and restart the server:

```bash
npx prisma migrate deploy
npx prisma generate
npm run dev
```

Public endpoints:
- `GET /api/listings?species=cat&location=Lahore&page=1` — published listings, 20 per page; contact numbers are excluded from browse results.
- `GET /api/listings/:id` — public details; sold listings hide contact numbers, and drafts return 404.

Authenticated owner endpoints:
- `GET /api/listings/mine`, `GET /api/listings/mine/:id`
- `POST /api/listings` — create a draft.
- `PATCH /api/listings/mine/:id` — save all editable fields and return to draft.
- `POST /api/listings/mine/:id/photos` — multipart `photo`, JPG/PNG/WebP, max 5 MB and 5 photos; draft only.
- `DELETE /api/listings/mine/:id/photos/:photoId` — draft only.
- `POST /api/listings/mine/:id/publish` — requires `{ "consent": true }` and at least one photo.
- `POST /api/listings/mine/:id/status` — `{ "status": "DRAFT" }` or `{ "status": "SOLD" }`; only published listings can be marked sold.
- `DELETE /api/listings/mine/:id`

Editable fields: `title`, `description`, `species`, optional `breed` and integer `age`, positive `price` in PKR, `location`, `phone`, and optional `whatsapp` (defaults to phone). Phone numbers accept international `+countrycode` notation or Pakistani `03` numbers, normalized to international form. Listings store independent seller-entered data; no private care records or account data are included in public responses. Cloudinary uses the existing server configuration for listing photos. No new dependencies are required.

Validation and privacy checks:

```bash
node --test test/listings.test.js test/recordQuality.test.js
```

An opt-in PostgreSQL integration test is available at `test/listings.integration.test.js`. It requires `LEONIS_TEST_API_URL=http://localhost:7462/api` and `LEONIS_TEST_DATABASE_URL` pointing to a disposable **localhost database named `leonis_smoke`**. Run a separate backend on port 7462 connected to that same database before running it. It seeds photo metadata, exercises real API operations and removes its test users/listings; it does not exercise external Cloudinary uploads.

## Single-seller store

Apply the additive `20261119000000_store` migration to your confirmed development database, generate the client, and restart:

```bash
npx prisma migrate deploy
npx prisma generate
npm run dev
```

After creating/signing up the intended account, grant store-admin access from this repository root:

```bash
node scripts/storeAdmin.js grant umairiqbal
```

To transfer admin access, sign up the replacement account first, grant access, then revoke the previous admin:

```bash
node scripts/storeAdmin.js grant replacement_username
node scripts/storeAdmin.js revoke umairiqbal
```

These commands use the server's configured database. Verify the database target before running them. Admin permissions are read from the database on every protected request, so granting/revoking takes effect without issuing a new JWT. Signup ignores role fields; there is no automatic first-user or username-based admin promotion. Existing users default to non-admin. Multiple admin accounts represent store staff, not multiple sellers.

At `/store/admin/settings`, choose the nationwide standard delivery fee in PKR, standard parcel limit in **grams**, and explicitly enable checkout. No rate or weight limit is seeded. Product weights include packaging. Products can be hidden without removing historic orders; at least one dedicated product photo is required before a product is made visible. Product photos use the existing private Cloudinary configuration, accept JPG/PNG/WebP, max 5 MB and 5 photos per product. Hide the product before changing photos.

Public API:
- `GET /api/store/products?species=cat&category=FEED&search=food&page=1` — visible catalogue, 20/page. Empty product species means suitable for all species.
- `GET /api/store/products/:id`, `GET /api/store/settings`.

Authenticated buyer API:
- `GET /api/store/access` — own store-admin permission only.
- `POST /api/store/checkout/preview` with `{ "items": [{ "productId": 1, "quantity": 2 }] }` — authoritative review totals and `quoteId`.
- `POST /api/store/orders` with the same items, `quoteId`, UUID-v4 `requestId`, `consent: true`, `recipientName`, `phone`, `address`, `city`, `province`, and optional five-digit `postalCode`. All delivery addresses are in Pakistan. Repeating a request ID returns the original order and does not reserve twice.
- `GET /api/store/orders`, `GET /api/store/orders/:id` — buyer-owned orders only.
- `POST /api/store/orders/:id/accept` with `{ "quoteVersion": 1, "consent": true }` — accept the latest delivery quote.
- `POST /api/store/orders/:id/cancel` — only before confirmation; releases stock once.

Store-admin API (fresh database permission check):
- `GET/POST /api/store/admin/products`, `GET/PATCH /api/store/admin/products/:id`. Fields: `name`, `description`, `category` (`FEED`, `ACCESSORY`, `GROOMING`, `CARE`, `OTHER`), species array, positive PKR `price`, available integer `stock`, positive integer `weightGrams`, booleans `requiresQuote` and `active`. Creates are hidden. Updates require `expectedUpdatedAt` from the latest fetched product to prevent overwriting stock reserved since the editor loaded.
- `POST /api/store/admin/products/:id/photos` (multipart `photo`), `DELETE /api/store/admin/products/:id/photos/:photoId`.
- `GET/PUT /api/store/admin/settings` — `standardFee`, positive `standardWeightLimitGrams`, `checkoutEnabled`.
- `GET /api/store/admin/orders?page=1` (30/page), `GET /api/store/admin/orders/:id`.
- `POST /api/store/admin/orders/:id/quote` with `shippingFee`. Allowed while awaiting a quote or buyer acceptance; each revision invalidates previous acceptance versions.
- `POST /api/store/admin/orders/:id/status` with `status`. Standard/accepted requests progress `PENDING → CONFIRMED → SHIPPED → DELIVERED`. Quoted orders must first progress `AWAITING_QUOTE → AWAITING_ACCEPTANCE → PENDING` through a buyer acceptance. Admins may cancel before shipment.

Stock is reserved transactionally on submission and restored exactly once on cancellation. Pending requests do not expire automatically; cancel abandoned requests to release stock. Order items retain price/name/weight snapshots. Delivery quotes and status changes serialize on each order; product locks prevent overselling, and totals are checked again on submission. Private delivery addresses are visible only to the buyer and authorized store admins. No courier API, automated messages, payment collection or multi-seller fulfillment is included.

Verification:

```bash
node --test test/store.test.js test/listings.test.js test/recordQuality.test.js
```

`test/store.integration.test.js` is opt-in, using the same disposable localhost `leonis_smoke` database and backend on port 7462 as the marketplace integration test. Set `LEONIS_TEST_DATABASE_URL` and `LEONIS_TEST_API_URL=http://localhost:7462/api` explicitly. It checks role denial/revocation, private-order ownership, server-side pricing, quote revision and acceptance, status transitions, cancellation stock restoration, and concurrent/idempotent reservations. It temporarily sets test delivery rates and restores the prior settings; run it only on the disposable database. Cloudinary uploads are separately smoke-tested with external storage simulated.

## Barn dashboard

Open `/barns` for owner-scoped cattle assignment/history, milk and animal-sale income, costs, dated payments and reports. The report distinguishes recorded operating margins from cash movement and does not claim complete net profit. Shared costs remain separate; no study prices are prefilled. Apply the additive `20261119010000_barns` migration before use. See [setup, API and report definitions](docs/barn-dashboard.md) and [research references](REFERENCES.md).

## Account workspaces

Signup offers Pets, Livestock, or both under one login. The header dropdown switches enabled workspaces and opens Manage workspaces; Marketplace/Store stay shared. Existing users are backfilled from their owned pet/cattle/barn records without changing animal IDs. Disabling a workspace hides navigation rather than deleting records. Apply `20261119020000_workspaces` before using the updated frontend. See [workspace behavior, migration and API](docs/workspaces.md).
