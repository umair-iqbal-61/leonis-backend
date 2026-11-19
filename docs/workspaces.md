# Pets and Livestock workspaces

Implemented 20 November 2026 from the owner's approved product decision: keep one login, separate pet-care and livestock navigation, choose at signup, and allow changes later. No external source was used to define these account preferences.

## User flow

- Signup requires a choice of **Pets**, **Livestock**, or **Pets and livestock**. Both starts in Pets; the starting workspace can be changed in settings.
- Pets shows pet profiles/care and hides cattle and barn navigation. Livestock shows dairy-cattle profiles and Barns. Each has its own add-animal screen/species choices.
- The header's Workspace dropdown switches between enabled workspaces and includes **Manage workspaces**. At `/workspaces`, enable either/both and select the starting workspace. Keep at least one enabled.
- Marketplace and Store remain shared. Store-admin permissions are independent and unchanged.
- `/dashboard` routes to the saved active workspace: `/pets` or `/livestock`.
- Opening a workspace-specific URL while another workspace is active offers an explicit switch/enable action. It does not silently change preferences.
- Existing `/pets/:id` and `/pets/:id/edit` record links continue working for the owner, including cattle. Their back links return to the animal's appropriate workspace. No animal IDs or records are moved or duplicated.

Workspaces organize the interface; they are not authorization roles or separate accounts. Owner-scoped APIs continue enforcing ownership independently. Disabling a workspace hides its navigation but does not delete data or revoke the owner's existing record access.

## Existing accounts

The additive `20261119020000_workspaces` migration backfills only User preferences:

| Existing data | Enabled workspaces | Initial active workspace |
| --- | --- | --- |
| Pet profiles only, or no animal/barn records | Pets | Pets |
| Dairy cattle or barns, without pet profiles | Livestock | Livestock |
| Pet profiles plus dairy cattle or barns | Both | Pets |

Unknown legacy species remain on the Pets side; `dairy-cattle` is the currently supported livestock species. Even archived barn history enables Livestock during backfill so financial history remains easy to find. Preferences do not automatically change whenever records change; users manage them explicitly.

In the isolated migration check, pet-only, cattle-only, mixed and barn-only fixtures received the expected preferences. The pre/post animal-row JSON snapshots matched exactly. No production/configured database was used.

## Setup and API

Apply to a confirmed development database, generate the client, then restart the backend:

```bash
npx prisma migrate deploy
npx prisma generate
npm run dev
```

- `POST /api/auth/register` additionally accepts `workspace: "PETS" | "LIVESTOCK" | "BOTH"`. The web signup requires an explicit selection; legacy API clients that omit it retain a Pets default. Invalid choices return 400. Response `{ token }` remains unchanged.
- Authenticated `GET /api/account/workspaces` returns only the signed-in user's `{ id, workspaces, activeWorkspace }`.
- Authenticated `PATCH /api/account/workspaces` accepts `workspaces: ["PETS", "LIVESTOCK"]` and/or `activeWorkspace`. Enabled values must be unique, valid and nonempty; active must be enabled. Removing the old active workspace without specifying a replacement selects the first remaining enabled workspace.
- Request user IDs, usernames and role flags cannot change another user or grant admin access. Preferences are persisted in PostgreSQL and reread at login, not placed into new JWT claims.
- The legacy `GET /api/pets` response remains the owner's full animal collection for compatibility. The two frontend lists filter the owned collection by species; record endpoints and owner checks are unchanged.

## Checks

```bash
node --test test/workspaces.test.js
```

`test/workspaces.integration.test.js` is opt-in against only the disposable localhost `leonis_smoke` database with `LEONIS_TEST_DATABASE_URL` and `LEONIS_TEST_API_URL=http://localhost:7462/api`, following the other integration tests. It checks all signup choices, legacy omissions, invalid preferences, retained records, owner isolation, unchanged admin permissions and fresh-login persistence.
