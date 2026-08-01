# Roadmap / Known Gaps

Status as of the initial build. This is an honest list, not a marketing one — read it before promising a client any of the unchecked items.

## Verified working

- [x] Monorepo builds clean: `shared` (dual CJS/ESM), `backend` (NestJS/Nest CLI), `frontend` (Vite/Rollup), `widget` (tsc + zip packaging)
- [x] Backend boots against real PostgreSQL, Prisma migration applies cleanly, `/api/health` reports DB connectivity
- [x] Migrated from OAuth2 to Kommo/amoCRM Private Integration long-lived token auth (see ARCHITECTURE.md, docs/AMOCRM_SETUP.md) — no client id/secret, redirect URI, or refresh token left in the codebase
- [x] Widget session JWT issuance + `WidgetSessionGuard` correctly rejects missing/invalid tokens and cross-account access
- [x] Full export UI verified in a real browser (Playwright): entity tabs, source mode, filter form (live pipeline/user dropdowns from the backend), column selector, dark/light theme, form submission, SSE progress streaming through to a terminal `failed` state with a sensible error message and reset affordance
- [x] Export job correctly fails gracefully (retry → `ServiceUnavailableException` → job marked `failed`) against an unreachable/fake amoCRM account, proving the retry + error-propagation + SSE pipeline works end-to-end

## Not yet done

- [ ] **Digital Pipeline → Google Sheets export never verified against a live account.** The `dp` manifest block, `webhook_url` payload shape, and the ack response `DigitalPipelineController` sends back are all implemented against the shape described in this project's own requirements, not a confirmed amoCRM spec — see the caveats in WIDGET.md and GOOGLE_SHEETS_SETUP.md. Before relying on it: upload the widget, wire up a real trigger, and confirm (a) the widget actually appears in the "Добавить триггер" modal, (b) the quick-setup fields render correctly from the declarative `dp.settings` schema, (c) the webhook fires with the payload shape assumed here, and (d) whatever ack response amoCRM actually expects back.
- [ ] **Google OAuth app not through Google's verification review.** The `spreadsheets` scope is sensitive; Google caps unverified external apps at ~100 test users and requires a security review (possibly CASA) before public/multi-tenant rollout — see GOOGLE_SHEETS_SETUP.md. Nothing in this codebase can complete that review for you.
- [ ] **No automated test suite.** Nothing here has unit or integration tests yet. See PROMPTS.md's "Add an automated test suite" entry for where to start.
- [ ] **No CI pipeline.** No GitHub Actions/etc. wired up to run `build`/`typecheck`/`lint` on push.
- [ ] **Never verified against a real amoCRM account.** All amoCRM API interaction (the `/api/v4/account` bootstrap check, leads/contacts/companies list+filter params, pipelines/users/notes endpoints) is implemented against amoCRM's *documented* REST API v4 shape, but this repo was built without access to a live amoCRM sandbox. Before production use: connect one real account with a real Private Integration long-lived token and verify the boot-time account check, list filters, and at least one export of each entity type end-to-end.
- [ ] **Widget loader selectors need verification.** `widget/src/script.ts`'s row-selection and toolbar-injection CSS selectors are best-effort against amoCRM's historically documented markup — see the note in WIDGET.md. Confirm against your actual account's current DOM.
- [ ] **No job history UI.** `ExportJob` rows accumulate in Postgres (indexed by `accountId`+`status` for exactly this) but there's no endpoint/UI to list a user's past exports — only the single in-flight job the current session started.
- [ ] **No structured/centralized logging or APM.** Backend uses Nest's built-in `Logger` to stdout only. No log aggregation, error tracking (Sentry, etc.), or metrics.
- [ ] **i18n is minimal.** Only the widget loader's button label/error string is localized (en/ru, `widget/i18n/`). The frontend SPA itself is English-only.
- [ ] **No rate-limit-aware amoCRM account-level backoff persistence.** If amoCRM starts rate-limiting an account hard, the in-process retry/backoff in `AmoCrmHttpClient` handles a single request's retries, but there's no account-wide circuit breaker across concurrent jobs.
- [ ] **`.xlsx` files accumulate on disk.** Completed export files are never cleaned up automatically — add a scheduled job (e.g. via `@nestjs/schedule`, already a dependency) to delete files older than N days from `EXPORT_STORAGE_DIR`.
- [ ] **BullMQ path is implemented but untested against real Redis** in this environment (no Redis available during the build/verification pass here). Logic was code-reviewed but not exercised.
- [ ] **No E2E test of the widget loader itself** (`widget/src/script.ts`) — it can only really be exercised inside a live amoCRM account page.

## Nice-to-haves (not required, not started)

- Job cancellation confirmation dialog (currently a single click cancels immediately)
- Export templates (save a named filter+column configuration for reuse)
- Multi-sheet exports mixing entity types in one workbook
- Webhook-triggered scheduled exports (currently user-initiated only)
