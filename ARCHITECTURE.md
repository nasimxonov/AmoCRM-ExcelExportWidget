# Architecture

## Overview

The system has four deployable pieces:

```
┌─────────────┐   in-page script    ┌──────────────────┐
│   amoCRM     │ ──────────────────▶│  widget/ (loader)│
│   account    │                    │  script.js       │
│   page       │◀── opens iframe ───│  manifest.json   │
└─────────────┘                     └──────────────────┘
                                              │
                                              ▼ opens iframe pointing at
                                     ┌──────────────────┐
                                     │ frontend/         │  React/Vite SPA
                                     │ (hosted, static)   │  hosted on its own domain
                                     └──────────────────┘
                                              │ HTTPS (JWT bearer)
                                              ▼
                                     ┌──────────────────┐
                                     │ backend/           │  NestJS API
                                     │ (hosted)           │
                                     └──────────────────┘
                                        │             │
                                        ▼             ▼
                                  PostgreSQL      amoCRM REST API v4
                                  (+ optional Redis)
```

`shared/` is not deployed — it's a workspace package of TypeScript types and Zod schemas imported by both `backend` and `frontend` so the export request/response contract can't drift between them.

## Why a separate widget/ loader and frontend/ SPA?

amoCRM's classic widget runtime executes a small JS/CSS bundle *directly inside the amoCRM account page* (not an iframe) via a `define(['jquery'], ...)` AMD-style contract (see `widget/src/script.ts`). That runtime is not a place to run a modern React/Tailwind bundle. Nearly every full-featured amoCRM integration (this one included) instead:

1. Ships a **thin loader** (`widget/`) that registers with amoCRM's widget lifecycle (`init`, `render`, `bind_actions`, `destroy`), adds an "Export to Excel" trigger to the current list view, and reads the current account/user/entity/selection context from the page.
2. Opens a **self-hosted iframe** (`frontend/`) — a full React SPA — passing that context as URL query parameters (`accountId`, `subdomain`, `userId`, `entityType`, `selectedIds`).

This is a deliberate, honest simplification: amoCRM does not expose a documented "modal API" stable enough to build against without a live account to test on, so the loader draws its own overlay/iframe/close-button rather than depending on undocumented internals. See [WIDGET.md](WIDGET.md) for the full handshake and its limitations.

## Clean Architecture in the backend

`backend/src/` is organized by *domain module*, each internally following Presentation → Application → Domain → Infrastructure:

| Layer | Backend location | Example |
|---|---|---|
| Presentation | `*.controller.ts` | `ExportController`, `AuthController` |
| Application | `*.service.ts` | `ExportService` (orchestration), `ExportProcessorService` (job execution) |
| Domain | `shared/src/types/*.ts` | `AmoLead`, `ExportRequest`, `ExportJob` |
| Infrastructure | `repositories/`, `*.client.ts` | `PrismaAccountRepository`, `AmoCrmHttpClient`, `ExcelExportWriter` |

**Repository Pattern**: every piece of external state access is behind an interface + DI token (`IAccountRepository` / `ACCOUNT_REPOSITORY`, `IExportJobRepository` / `EXPORT_JOB_REPOSITORY`, `IExportQueueAdapter` / `EXPORT_QUEUE_ADAPTER`, `IGoogleAccountRepository` / `GOOGLE_ACCOUNT_REPOSITORY`). Swapping Prisma for another ORM, or BullMQ for another queue, means writing a new adapter — not touching application logic.

**Dependency Injection**: standard Nest module graph. `AccountModule` (Prisma-backed account/token storage) has no dependencies; `AmoCrmModule` depends on it for token refresh; `AuthModule` and `ExportModule` depend on both. Any module that guards a route with `WidgetSessionGuard` must import `AccountModule` directly (the guard needs `ACCOUNT_REPOSITORY` resolved in its own module's injector context) — see `MetaModule` for the minimal example.

### Digital Pipeline → Google Sheets export

A second, independent flow alongside the manual export: `backend/src/google/` holds Google OAuth (`GoogleOAuthService`, token refresh mirrors `AmoCrmTokenProvider`'s shape) and Sheets writing (`GoogleSheetsService`); `backend/src/digital-pipeline/` holds the public webhook (`POST /api/webhooks/digital-pipeline`, no `WidgetSessionGuard` — amoCRM calls it server-to-server, not through the browser session flow) that orchestrates: look up the `AmoAccount`, look up its connected `GoogleAccount`, fetch the lead via the existing `LeadsRepository`, append a row via `GoogleSheetsService`. Google refresh/access tokens are encrypted at rest (`GoogleAccount.refreshTokenEncrypted`/`accessTokenEncrypted`, AES-256-GCM via `google/crypto/token-cipher.ts`) since — unlike `AMOCRM_LONG_LIVED_TOKEN`, an env-only secret — these are per-customer secrets living in the database. See [WIDGET.md](WIDGET.md#digital-pipeline-trigger-google-sheets-export) and [docs/GOOGLE_SHEETS_SETUP.md](docs/GOOGLE_SHEETS_SETUP.md).

## Key design decisions

### Dual-build shared package (CJS + ESM)

`shared/` builds twice — `dist/cjs` (consumed by NestJS via `require`) and `dist/esm` (consumed by Vite/Rollup). A single CJS build works fine for Node, but Rollup's static named-export detection cannot see through TypeScript's `export *` re-export helper reliably in every case, and depending on that instead of a real ESM build is fragile. Dual output plus explicit named re-exports in `shared/src/index.ts` sidesteps the whole class of bug. `package.json#exports` picks the right one via the `import`/`require` conditions.

### Streaming Excel generation

`ExcelExportWriter` (`backend/src/export/excel/excel-export-writer.ts`) wraps `ExcelJS.stream.xlsx.WorkbookWriter`, which flushes rows to disk as they're written instead of building the workbook in memory. Combined with `AmoCrmPaginator`'s async-generator pagination (`backend/src/amocrm/amocrm-paginator.ts`) and chunked `findByIds` for "selected records" mode, the export pipeline never holds more than one page (≤250 records) in memory regardless of total export size — this is what makes 100,000+ row exports viable.

### Progress reporting without a total-count endpoint

amoCRM's v4 list endpoints don't return a total record count, only pages. So:
- **Selected mode**: total is known upfront (`selectedIds.length`) → the UI shows a real percentage progress bar.
- **Filtered / All mode**: total is unknown until the last page is fetched → the UI shows a live "N records processed" counter instead of a percentage, switching to a determinate 100% only once the job completes.

This is documented behavior, not a bug — see `ExportJob.progress.total === 0` handling in `frontend/src/components/export/progress-card.tsx`.

### N+1 avoidance for linked contacts/companies

amoCRM's leads list only embeds `{ id }` for linked contacts/companies (no name), and contacts/companies only embed bare ids for linked companies/contacts. Rather than one request per referenced record, `EntityRefResolverService` batch-resolves names via `filter[id][]=...` in chunks of 250 (amoCRM's own page-size ceiling) per page fetched.

### Notes are opt-in and expensive

There is no bulk "notes for these N records" amoCRM endpoint — notes are fetched per-record (`GET /api/v4/{type}/{id}/notes`). `NotesService` runs these with a small (4) concurrency pool. Enabling "Include notes" in the UI multiplies the number of API calls by the record count, so it's off by default and explicitly labeled "slower" in the UI.

### Rate limiting, retries, and Private Integration auth

`AmoCrmHttpClient` (`backend/src/amocrm/amocrm-http.client.ts`) enforces a minimum 150ms gap between requests per account (amoCRM's soft ~7 req/s cap), retries `429` honoring `Retry-After`, retries transient 5xx/network errors with exponential backoff (up to 5 attempts), and retries once automatically on an unexpected `401`. Authentication is a Kommo/amoCRM **Private Integration long-lived token** (`AMOCRM_LONG_LIVED_TOKEN`, see [docs/AMOCRM_SETUP.md](docs/AMOCRM_SETUP.md)) rather than OAuth2 — `AmoCrmTokenProvider` just reads the token from config on every call instead of exchanging/refreshing anything, since long-lived tokens have no `refresh_token` and don't rotate on their own. `AmoCrmAccountBootstrapService` resolves which amoCRM account the token belongs to once at boot (`GET /api/v4/account`) and caches it in the `AmoAccount` table, since the token itself carries no account id.

### Pluggable job queue

`IExportQueueAdapter` has two implementations: `InMemoryQueueAdapter` (default, FIFO, concurrency 2 — sufficient for a single backend instance) and `BullMqQueueAdapter` (Redis-backed, used automatically when `REDIS_URL` is set — required once you run more than one backend replica, since jobs must be pickable by any instance). Selection happens in `ExportModule`'s factory provider for `EXPORT_QUEUE_ADAPTER`; no application code depends on which one is active.

### Cancellation

`JobCancellationRegistry` holds an `AbortController` per running job id. The export loop checks `signal.aborted` between batches. A cancel request for a job that hasn't started processing yet (still queued) sets its DB status directly instead, and `ExportProcessorService.run()` checks for that terminal status before doing any work.

## What is *not* built

See [TODO.md](TODO.md) for the honest list of things a production rollout would still need (automated tests, CI, real amoCRM sandbox verification, i18n beyond en/ru strings, structured audit logging).
