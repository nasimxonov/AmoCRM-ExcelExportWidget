# API Reference

Base URL: `APP_URL` (e.g. `http://localhost:3001`). All request/response bodies are JSON unless noted. All routes are prefixed `/api`.

Types referenced below (`ExportRequest`, `ExportJob`, etc.) are defined in `shared/src/types/export.ts` and `shared/src/dto/*.ts` — those Zod schemas are the source of truth for validation.

## Authentication

Every route except `/api/auth/*` and `/api/health` requires:

```
Authorization: Bearer <widget session JWT>
```

obtained from `POST /api/auth/session`. The SSE stream route additionally accepts the token as a query param (`?token=...`) since browsers' native `EventSource` cannot set custom headers.

A request with a missing/invalid/expired token receives `401`. A request for a job/resource owned by a different account receives `403`.

### `POST /api/auth/session`

Exchanges the amoCRM context (read by the widget loader from the amoCRM page) for a short-lived JWT. Fails with `401` if the account doesn't match the one connected via the backend's Private Integration long-lived token (see [docs/AMOCRM_SETUP.md](docs/AMOCRM_SETUP.md) — that account is registered automatically at backend startup, not through a per-account install endpoint).

Request:
```json
{ "accountId": 12345678, "subdomain": "yourcompany", "userId": 42 }
```
Response:
```json
{ "token": "eyJhbGciOi...", "expiresIn": 43200 }
```

## Meta

### `GET /api/meta/pipelines`

Returns the connected account's pipelines and statuses (used to populate the filter form). Response: `AmoPipeline[]`.

### `GET /api/meta/users`

Returns the connected account's users (for the "responsible user" filter). Response: `AmoUser[]`.

## Export

### `POST /api/export`

Creates and enqueues an export job. Body is an `ExportRequest`:

```ts
{
  entityType: 'leads' | 'contacts' | 'companies',
  sourceMode: 'selected' | 'filtered' | 'all',
  selectedIds: number[],        // required (non-empty) when sourceMode === 'selected'
  filters: {
    pipelineId: number | null,       // leads only
    statusId: number | null,         // leads only
    responsibleUserId: number | null,
    query: string | null,
    createdRange: { from: string | null, to: string | null } | null,  // ISO 8601
    updatedRange: { from: string | null, to: string | null } | null,
  },
  columns: ExportColumnKey[],   // at least one; see AVAILABLE_EXPORT_COLUMNS per entity
  includeCustomFields: boolean,
  includeNotes: boolean,        // slow — see ARCHITECTURE.md
  fileName: string | null,      // sanitized server-side; .xlsx appended if missing
}
```

Response: `ExportJob` (status `pending`).

### `GET /api/export/:jobId`

Returns the current `ExportJob` snapshot (for polling).

### `GET /api/export/:jobId/stream`

Server-Sent Events stream of `ExportJob` snapshots as the job progresses. Closes automatically once the job reaches `completed`, `failed` or `cancelled`.

### `POST /api/export/:jobId/cancel`

Requests cancellation. Jobs already `completed`/`failed` are returned unchanged. Otherwise the in-flight fetch loop is aborted (or, if the job hadn't started yet, marked `cancelled` directly) and the updated `ExportJob` is returned.

### `GET /api/export/:jobId/download`

Streams the generated `.xlsx` file (`Content-Disposition: attachment`). `404` if the job isn't `completed` or the file no longer exists on disk.

## `ExportJob` shape

```ts
{
  id: string,
  accountId: number,
  entityType: 'leads' | 'contacts' | 'companies',
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled',
  progress: {
    processed: number,
    total: number,          // 0 means "unknown yet" — see ARCHITECTURE.md
    percentage: number,      // 0 when total is unknown
    currentStage: 'fetching' | 'transforming' | 'writing' | 'done',
  },
  fileName: string | null,
  downloadUrl: string | null,   // set once status === 'completed'
  errorMessage: string | null,
  createdAt: string,
  updatedAt: string,
  completedAt: string | null,
}
```

## Health

### `GET /api/health`

No auth required. Returns `{ status: 'ok' | 'degraded', uptimeSeconds: number, database: boolean }`.

## Errors

All errors follow:
```json
{ "statusCode": 400, "path": "/api/export", "timestamp": "...", "message": "...", "details": [...] }
```
`details` is present for validation errors (array of `{ path, message }`) — see `GlobalExceptionFilter` and `ZodValidationPipe`.

## Rate limiting

All `/api` routes are throttled per-IP via `@nestjs/throttler` (`THROTTLE_TTL` seconds / `THROTTLE_LIMIT` requests, configurable in `backend/.env`).
