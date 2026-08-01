# Install (Local Development)

## Prerequisites

- Node.js ≥ 20, npm ≥ 10
- Docker (for the bundled Postgres/Redis dev services), or your own PostgreSQL ≥ 14 instance
- An amoCRM/Kommo account with admin access, if you want to connect a real Private Integration (see [AMOCRM_SETUP.md](AMOCRM_SETUP.md)) — not required to run the app and exercise the UI

## 1. Install dependencies

```bash
npm install
```

This installs all four workspaces (`shared`, `backend`, `frontend`, `widget`) via npm workspaces from the single root `package.json`.

## 2. Start Postgres (and optionally Redis)

```bash
docker compose up -d postgres
# or, if you also want to test the BullMQ queue adapter instead of the in-memory one:
docker compose up -d postgres redis
```

`docker-compose.yml` maps Postgres to host port `5432` and Redis to `6379`. If either port is already taken on your machine, edit the `ports:` mapping in `docker-compose.yml` and update `DATABASE_URL`/`REDIS_URL` accordingly.

## 3. Configure environment variables

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Edit `backend/.env`:

| Variable | How to get it |
|---|---|
| `AMOCRM_SUBDOMAIN` / `AMOCRM_LONG_LIVED_TOKEN` | From your amoCRM Private Integration's "Keys and scopes" tab — see [AMOCRM_SETUP.md](AMOCRM_SETUP.md). For UI-only development any non-empty placeholder string works for both; the backend verifies them against `/api/v4/account` at boot and just logs a warning (rather than refusing to start) if they don't resolve to a real account — see step 6 below. |
| `JWT_SECRET` | Any string ≥ 16 characters, e.g. `openssl rand -hex 24` |
| `DATABASE_URL` | Leave as-is if using the bundled `docker-compose.yml` Postgres |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | From a Google Cloud OAuth client — see [GOOGLE_SHEETS_SETUP.md](GOOGLE_SHEETS_SETUP.md). Same placeholder-friendly rule as the amoCRM credentials: any non-empty string satisfies startup validation; only the actual "Connect Google Account" flow needs real values. |
| `GOOGLE_TOKEN_ENCRYPTION_KEY` | Must be a real 64-character hex string even as a placeholder (validated by format, not just presence) — `openssl rand -hex 32` |

`frontend/.env` just needs `VITE_API_URL` pointing at the backend (default `http://localhost:3001` is correct for local dev).

## 4. Build the shared package and set up the database

```bash
npm run build:shared
npm run prisma:generate -w backend
npm run prisma:migrate -w backend
```

## 5. Run everything

```bash
npm run dev
```

Starts the backend (`http://localhost:3001`, NestJS watch mode) and frontend (`http://localhost:5173`, Vite) concurrently.

## 6. Open the export UI without a real amoCRM account

The frontend reads its context from URL query params, so you can load it directly:

```
http://localhost:5173/?accountId=123&subdomain=test&userId=1&entityType=leads&selectedIds=1,2,3
```

This will fail at `POST /api/auth/session` with a 401 unless an `AmoAccount` row exists for `accountId=123`/`subdomain=test` — see [UI.md](UI.md#testing-in-a-browser-without-a-real-amocrm-account) for seeding one manually via Prisma Studio (`npm run prisma:studio -w backend`) if `AMOCRM_LONG_LIVED_TOKEN` isn't a real, working token (see step 3's table). With a seeded row and a placeholder token, the export form works fully but any actual export job will fail once it tries to call the real amoCRM API — which is still useful for testing the error/retry/progress UI.

For a real, working export, follow [AMOCRM_SETUP.md](AMOCRM_SETUP.md) to connect an actual amoCRM account.

## Troubleshooting

- **`Invalid environment configuration` on backend start** — `backend/src/config/env.validation.ts` validates `.env` with Zod at boot; the error message lists exactly which variable is missing/invalid.
- **`P1001: Can't reach database server`** — Postgres isn't running or `DATABASE_URL` doesn't match how you started it (port, credentials).
- **Frontend shows "Missing amoCRM context"** — you opened the frontend without the `accountId`/`subdomain`/`userId` query params; see step 6.
