# Leonis Backend

Express/Prisma REST API powering **Leonis** (formerly PawPal), an AI-powered pet care app. Built as a from-scratch replacement for an original Supabase backend — custom auth, nested resource routes, Cloudinary-backed storage, and a Groq LLM proxy for AI chat.

**Live API:** `https://pawpal-backend-ekyt.onrender.com`
**Frontend:** [pawpal.umairiqbal.tech](https://pawpal.umairiqbal.tech)

> Free-tier hosting: the API spins down after 15 minutes of inactivity. First request after idle can take 30–50 seconds to wake up.

## Stack

- **Runtime:** Node.js, Express 5 (ESM)
- **Database:** PostgreSQL via [Neon](https://neon.tech), accessed through Prisma 7 with the `@prisma/adapter-pg` driver adapter
- **Auth:** JWT + bcrypt (no OAuth)
- **Storage:** Cloudinary (photo gallery + pet avatars)
- **AI:** Groq (`openai/gpt-oss-20b`) as a server-side chat proxy
- **Deployment:** Render

## Architecture

Resources are nested under their owning pet, scoped and ownership-checked via middleware, rather than trusting client-supplied IDs:

\```
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
\```

**Middleware chain:** `validateToken` (verifies JWT, attaches `req.user`) → `verifyPetOwnership` (confirms the pet belongs to the requesting user, attaches `req.pet`) → route handler.

## Data model

`User → Pet → { Meal, Weight, VetVisit, Reminder, Photo }`, all cascade-deleted with their parent pet. See `prisma/schema.prisma` for full field definitions.

## Local setup

\```bash
npm install
npx prisma generate
\```

Create a `.env` with:

\```
DATABASE_URL=
JWT_SECRET=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
GROQ_API_KEY=
PORT=7461
\```

Run migrations, then start dev:

\```bash
npx prisma migrate dev
npm run dev
\```

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start with nodemon (local dev) |
| `npm start` | Start with plain `node` (production) |

## Notable build decisions

- **Nested over flat routing** for sub-resources: a Meal/Weight/VetVisit/Reminder/Photo only ever exists in the context of one pet, so ownership is checked once per request via middleware.
- **One deliberate exception:** `/api/reminders` is flat — it backs a background check across *all* of a user's pets, which the nested pattern can't express without an N+1 request pattern.
- **Dates/times** (vet visits, reminders) are explicitly parsed and anchored to UTC server-side to avoid timezone drift between client input and stored values.
- **Pet avatars** are a single field on `Pet` (`avatarUrl`), separate from the `Photo` gallery — one current avatar, not a history.

## Known limitations

- Response shapes aren't fully standardized across all routes yet (`{ data }` vs `{ message, data }`).
- Replaced Cloudinary assets (old avatars, deleted photos) aren't cleaned up yet — no soft-delete/retention policy.
- PATCH (edit) routes exist for Meal/Weight/VetVisit/Reminder but have no frontend UI yet.
