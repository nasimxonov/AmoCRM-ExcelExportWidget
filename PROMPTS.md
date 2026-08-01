# Reusable Prompts

Prompts for extending this project with an AI coding assistant, written so they carry enough context to be dropped in cold. Each references the specific files involved — read [ARCHITECTURE.md](ARCHITECTURE.md) first if you haven't touched this repo before.

## Add a new export column

> Add a `{ColumnName}` column to the `{leads|contacts|companies}` export. It should show `{description of the value}`, sourced from `{amoCRM field/relationship}`. Follow the pattern in `backend/src/export/excel/column-formatters.ts` — add the `ExportColumnKey` to `shared/src/types/export.ts` first (label + availability per entity), rebuild `shared`, then add the corresponding `ColumnDef` entry. Don't forget the mapper in `backend/src/amocrm/mappers/{entity}.mapper.ts` if the underlying data isn't already on the `Amo{Entity}` shared type.

## Add a new entity type (e.g. Tasks)

> Add support for exporting `{Entity}` alongside Leads/Contacts/Companies. This touches: `ExportEntityType` in `shared/src/types/export.ts`; a new `Amo{Entity}` type in `shared/src/types/amocrm.ts`; a raw type + mapper in `backend/src/amocrm/interfaces/amocrm-raw.types.ts` and `backend/src/amocrm/mappers/`; a repository in `backend/src/amocrm/repositories/` following `LeadsRepository`'s `streamAll`/`findByIds` pattern; a `build{Entity}Columns` function in `column-formatters.ts`; a case in `ExportProcessorService.findByIds`/`streamAll`; and the frontend's `EntityTypeTabs` labels + `DEFAULT_EXPORT_COLUMNS`/`AVAILABLE_EXPORT_COLUMNS` in shared. Check whether amoCRM's REST API actually supports listing/filtering this entity before starting.

## Add a new filter

> Add a `{filterName}` filter for `{entity types}` exports. Add the field to `ExportFilters` in `shared/src/types/export.ts` and its Zod validation in `shared/src/dto/export.dto.ts`; map it to an amoCRM `filter[...]` query param in `backend/src/amocrm/filters/build-query-params.ts`; add the UI control to `frontend/src/components/export/filter-form.tsx`.

## Swap the job queue backend

> We're moving from the in-memory queue to BullMQ-backed queueing for a multi-instance deployment. `BullMqQueueAdapter` already exists in `backend/src/export/queue/bullmq-queue.adapter.ts` and is selected automatically by `ExportModule` when `REDIS_URL` is set — verify it against a real Redis instance and adjust `concurrency`/`removeOnFail` in that file if needed. No other code should need to change; if it does, something depends on `InMemoryQueueAdapter` internals and that's a bug.

## Investigate a stuck/failed export job

> An export job with id `{jobId}` is stuck in `{status}`. Check `ExportJob.errorMessage` and `stage` via `GET /api/export/{jobId}` or Prisma Studio (`npm run prisma:studio -w backend`). Trace through `ExportProcessorService.run()` for what could produce that state — check the backend logs around the timestamp for `AmoCrmHttpClient` retry/rate-limit warnings first, since most stuck-in-`processing` cases are amoCRM API issues, not application bugs.

## Add an automated test suite

> There is currently no test suite (see TODO.md). Start with: (1) unit tests for `column-formatters.ts` and the mappers in `backend/src/amocrm/mappers/` — pure functions, easy to test with fixture raw amoCRM payloads; (2) an integration test for `AmoCrmHttpClient`'s retry/rate-limit logic using `nock` or `msw` against fake amoCRM responses; (3) an e2e test for the boot-time account bootstrap → session → export happy path against a test Postgres instance. Use NestJS's `@nestjs/testing` module for anything touching the DI graph.
