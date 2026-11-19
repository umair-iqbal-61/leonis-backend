# Leonis Backend

## Commands

Run from this repository root with Node.js 24. Have the user configure
`DATABASE_URL` for a dedicated development PostgreSQL database and `JWT_SECRET`.
Cloudinary credentials are needed for uploads and `GROQ_API_KEY` for chat.
The API defaults to port 7461.

```bash
npm ci
npm run build             # Generates the Prisma client; no database changes.
npx prisma migrate deploy # Apply checked-in migrations to the development database.
npm run dev               # Nodemon. Use npm start to run without watch mode.
```

There is no lint script. Run the rule tests and benchmark without a database.

```bash
node --test --test-reporter=tap test/recordQuality.test.js
node --test test/listings.test.js
node --test test/store.test.js
node --test test/barn.test.js
node --test test/workspaces.test.js
node benchmark/evaluate.js
```

Run the syntax check for handwritten JavaScript, then the smoke test with the server running.

```bash
node --check index.js
find src/routes src/middleware src/lib src/quality src/store src/barn src/account scripts -name '*.js' -exec sh -c '
  for file do node --check "$file" || exit 1; done
' sh {} +
```

```bash
(
  set -euo pipefail
  api=http://localhost:7461/api
  username="smoke-$(date +%s)-$$"
  token=$(curl -fsS "$api/auth/register" -H 'Content-Type: application/json' \
    --data "{\"username\":\"$username\",\"password\":\"local-smoke-password\"}" |
    node -e 'const { token } = JSON.parse(require("node:fs").readFileSync(0, "utf8")); if (!token) process.exit(1); process.stdout.write(token)')
  curl -fsS "$api/pets" -H "Authorization: Bearer $token" # Expect {"data":[]}.
)
```

## Code style

- Use JavaScript ES modules with explicit extensions on relative imports. Keep
  TypeScript limited to Prisma config and generated code unless requested.
- Match nearby code. Prefer two-space indentation, single quotes, no semicolons,
  camelCase identifiers, and the existing `*Routes.js` naming for route modules.
- Reuse the shared Prisma client. Keep JWT checks and pet ownership scoping on
  protected routes, and preserve existing response shapes used by the frontend.

## Guardrails

- Keep `REFERENCES.md` updated when researching Leonis issues: record the date, topic, primary source links, use, affected files and limitations. Separate evidence from project assumptions.
- Work on a dedicated branch. Ask before modifying `main`.
- Never read, create, or edit `.env` files or expose secrets.
- `npm ci` installs existing locked dependencies. Ask before adding or upgrading dependencies.
- Run migrations and smoke tests only against a dedicated development database.
- Update `prisma/schema.prisma` and migrations for schema changes. Never edit generated client files.
