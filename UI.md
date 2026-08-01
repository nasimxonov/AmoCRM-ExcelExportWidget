# Frontend UI

`frontend/` is a Vite + React 18 + TypeScript SPA styled with Tailwind and a hand-written shadcn/ui-style component set (Radix primitives + `class-variance-authority` + `tailwind-merge`, matching the shadcn conventions but committed as regular source files rather than pulled from the shadcn CLI, since this repo has no network-dependent codegen step at build time).

## Structure

```
frontend/src/
├── main.tsx               React root + TanStack Query provider
├── App.tsx                Top-level session state machine (loading/error/ready) + theme toggle + close button
├── index.css              Tailwind layers + CSS custom properties (design tokens, light/dark)
├── lib/
│   ├── amocrm-context.ts  Reads accountId/subdomain/userId/entityType/selectedIds from the URL
│   ├── parent-messenger.ts postMessage close signal back to the widget loader
│   ├── session-store.ts   In-memory JWT holder (not localStorage — token is short-lived and per-iframe-load)
│   ├── api-client.ts      Axios instance, attaches Authorization header
│   ├── export-api.ts      Typed calls to /api/export/*, SSE subscription helper
│   └── meta-api.ts        Typed calls to /api/meta/*
├── hooks/
│   ├── use-widget-session.ts  Establishes the backend session on mount (React Query)
│   ├── use-export-job.ts      Create/cancel a job, subscribe to SSE with polling fallback
│   ├── use-theme.ts           light/dark/system, persisted to localStorage
│   └── use-toast.ts           shadcn-style toast state machine
├── components/
│   ├── ui/                Design-system primitives: button, card, input, label, select, switch,
│   │                      tabs, progress, badge, toast/toaster
│   ├── theme-toggle.tsx
│   └── export/
│       ├── export-panel.tsx      Orchestrates the whole export form + submits + shows progress
│       ├── entity-type-tabs.tsx  Leads / Contacts / Companies
│       ├── source-mode-select.tsx Selected / Filtered / All
│       ├── filter-form.tsx       Pipeline/status/user/query/date-range filters (filtered mode only)
│       ├── column-selector.tsx   Per-entity checkbox grid, backed by shared AVAILABLE_EXPORT_COLUMNS
│       └── progress-card.tsx     Progress bar or live counter, cancel, download, error states
└── types/
```

## Design tokens

`index.css` defines the full shadcn token set (`--background`, `--foreground`, `--primary`, `--muted`, `--destructive`, `--success`, `--border`, `--ring`, `--radius`, …) as HSL triplets under `:root` and `.dark`. `tailwind.config.ts` maps these to Tailwind color/radius utilities (`bg-background`, `text-muted-foreground`, `rounded-lg`, etc.) so components never hardcode a hex value — changing the palette means editing `index.css` only.

Theme switching (`useTheme`) toggles the `.dark` class on `<html>`; `system` mode also listens to `prefers-color-scheme` changes live.

## State management

- **Server state** (pipelines, users, export job status): TanStack Query. No global Redux/Zustand store — this app has exactly one meaningful screen, so component-local `useState` plus the two custom hooks (`use-widget-session`, `use-export-job`) is enough; introducing a global store here would be the kind of premature abstraction this project explicitly avoids.
- **Form state**: plain `useState` in `ExportPanel`, validated on submit against the *same* `exportRequestSchema` Zod schema the backend uses (imported from `shared/`) — client and server validation can't drift.

## Progress UI semantics

`ProgressCard` renders a determinate `<Progress>` bar only when `job.progress.total > 0` (true for "selected records" mode, where the count is known upfront). For "filtered"/"all" modes, `total` stays `0` until the job finishes, so it instead shows a live "N records processed…" counter with a spinner — see ARCHITECTURE.md for why amoCRM's API makes a true percentage impossible to compute early for those modes.

## Adding a new export column

1. Add the key to `ExportColumnKey` in `shared/src/types/export.ts`, plus a label in `EXPORT_COLUMN_LABELS` and an entry in `AVAILABLE_EXPORT_COLUMNS` (and `DEFAULT_EXPORT_COLUMNS` if it should be checked by default) for the relevant entity type(s).
2. Add a `ColumnDef` entry in the matching `build*Columns()` function in `backend/src/export/excel/column-formatters.ts`.
3. Rebuild `shared` (`npm run build:shared`) before rebuilding backend/frontend — both consume its compiled output, not the TS source directly.

No frontend change is needed beyond that — `ColumnSelector` renders whatever `AVAILABLE_EXPORT_COLUMNS` lists automatically.

## Testing in a browser without a real amoCRM account

The app reads its context from the URL, so you can open it directly:

```
http://localhost:5173/?accountId=123&subdomain=test&userId=1&entityType=leads&selectedIds=1,2,3
```

`POST /api/auth/session` will `401` unless an `AmoAccount` row exists for that `accountId`/`subdomain` in your local database. `AmoCrmAccountBootstrapService` creates this row automatically at boot from `AMOCRM_SUBDOMAIN`/`AMOCRM_LONG_LIVED_TOKEN` if they resolve to a real account; otherwise seed one manually via Prisma Studio (`npm run prisma:studio -w backend`) — a real long-lived token isn't required for UI development, since the export itself will simply fail against amoCRM's real API if the token isn't valid, which is still useful for exercising the error/retry/progress UI end to end.
