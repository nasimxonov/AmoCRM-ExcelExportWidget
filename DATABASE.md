# Database

PostgreSQL via Prisma. Schema: `backend/prisma/schema.prisma`. Migrations: `backend/prisma/migrations/`.

## Models

### `AmoAccount`

Single row caching the amoCRM account that owns this deployment's Private Integration long-lived token. Populated automatically at boot by `AmoCrmAccountBootstrapService` (see [ARCHITECTURE.md](ARCHITECTURE.md)) rather than through an install/callback flow — there's no per-account token to store here, since the actual bearer token lives only in `AMOCRM_LONG_LIVED_TOKEN` (backend env), never in the database.

| Field | Type | Notes |
|---|---|---|
| `id` | `Int` (PK) | Internal id — used as the foreign key everywhere else in this schema |
| `accountId` | `BigInt` (unique) | amoCRM's own account id |
| `subdomain` | `String` | e.g. `yourcompany` (account is at `yourcompany.amocrm.ru`) |
| `connectedAt` / `updatedAt` | `DateTime` | |

### `ExportJob`

Persisted state for a background export so progress survives process restarts and can be polled/streamed.

| Field | Type | Notes |
|---|---|---|
| `id` | `String` (UUID, PK) | |
| `accountId` | `Int` | FK → `AmoAccount.id` |
| `entityType` | `ExportEntityTypeDb` enum | `leads` / `contacts` / `companies` |
| `status` | `ExportJobStatusDb` enum | `pending` / `processing` / `completed` / `failed` / `cancelled` |
| `requestPayload` | `Json` | The full validated `ExportRequest` that created this job — replayable/auditable |
| `processed` / `total` | `Int` | See ARCHITECTURE.md re: `total` semantics |
| `stage` | `String` | `fetching` / `transforming` / `writing` / `done` |
| `fileName` / `filePath` | `String?` | `filePath` is the on-disk location under `EXPORT_STORAGE_DIR`, set once completed |
| `errorMessage` | `String?` | Set on failure |
| `createdAt` / `updatedAt` / `completedAt` | `DateTime` | |

Indexed on `(accountId, status)` for the "list my running jobs" access pattern (not currently exposed as an endpoint, but the index is there for when a job-history UI is added — see TODO.md).

## Why Prisma enums instead of the shared TypeScript enums directly

`ExportEntityTypeDb`/`ExportJobStatusDb` mirror `ExportEntityType`/`ExportJobStatus` from `shared/`, but are declared separately in `schema.prisma` because Prisma enums are a schema-level concept independent of the TypeScript layer. The string values are kept identical (`"leads"`, `"pending"`, etc.) so the repository mapping in `backend/src/export/repositories/export-job.repository.ts` is a straight cast, not a translation table.

## Migrating

```bash
npm run prisma:migrate -w backend   # dev: creates + applies a new migration
npm run prisma:deploy -w backend    # prod: applies pending migrations only, no schema diffing
npm run prisma:studio -w backend    # visual browser for the database
```
