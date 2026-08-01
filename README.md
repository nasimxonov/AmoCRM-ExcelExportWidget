# amoCRM Excel Export Widget

An enterprise-grade [amoCRM](https://www.amocrm.ru) / [Kommo](https://www.kommo.com) widget that exports **Leads**, **Contacts** and **Companies** into formatted Microsoft Excel (`.xlsx`) files — selected records, filtered records, or the entire account, including custom fields, tags, phones, emails, pipeline/status, responsible user and (optionally) notes.

It is functionally comparable to commercial widgets like [nova-amocrm.ru/widgets/gt_export](https://nova-amocrm.ru/widgets/gt_export), built from scratch with an original architecture.

## Monorepo layout

```
with-excel/
├── shared/     TypeScript types, zod schemas — consumed by both backend and frontend
├── backend/    NestJS API: Private Integration auth, amoCRM REST client, background export jobs, ExcelJS generation
├── frontend/   React + Vite + Tailwind + shadcn/ui export configuration UI (runs in an iframe)
├── widget/     The small in-page amoCRM widget loader (manifest.json + script.js) that opens /frontend
└── docs/       Setup, deployment and amoCRM configuration guides
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for how these pieces fit together and why.

## Features

- Export **Leads**, **Contacts**, **Companies** — selected / filtered / all records
- Preserves headers, dates, phone numbers, emails, custom fields, tags, responsible user, pipeline, status, budget, created/updated dates, notes (opt-in), linked company/contacts
- Modern `.xlsx` output via [ExcelJS](https://github.com/exceljs/exceljs): bold frozen header row, auto column width, native date/number formatting, hyperlinks, conditional status coloring, a "Summary" sheet describing the export
- Kommo/amoCRM Private Integration auth via a long-lived Bearer token — no OAuth client id/secret, redirect URI, or refresh flow
- Retry + rate-limit-aware amoCRM API client with cursor-style pagination
- Streaming `.xlsx` writer + chunked fetching — designed for 100,000+ row exports without buffering the whole result set in memory
- Live progress via Server-Sent Events (with polling fallback), cancel-in-flight support
- Dark/light theme, responsive UI, toast notifications

## Quick start

```bash
npm install
docker compose up -d postgres redis   # or point DATABASE_URL/REDIS_URL at your own instances
cp backend/.env.example backend/.env  # fill in AMOCRM_SUBDOMAIN, AMOCRM_LONG_LIVED_TOKEN, JWT_SECRET
cp frontend/.env.example frontend/.env
npm run build:shared
npm run prisma:generate -w backend
npm run prisma:migrate -w backend
npm run dev
```

Backend runs on `http://localhost:3001`, frontend on `http://localhost:5173`. Full walkthrough: [docs/INSTALL.md](docs/INSTALL.md). Connecting a real amoCRM account: [docs/AMOCRM_SETUP.md](docs/AMOCRM_SETUP.md). Production deployment: [docs/DEPLOY.md](docs/DEPLOY.md).

## Documentation index

| Doc | Contents |
|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Clean Architecture layers, module boundaries, key design decisions |
| [API.md](API.md) | Backend REST/SSE endpoint reference |
| [DATABASE.md](DATABASE.md) | Prisma schema and data model |
| [WIDGET.md](WIDGET.md) | amoCRM widget lifecycle, iframe context passing |
| [UI.md](UI.md) | Frontend structure, design tokens, component conventions |
| [PROMPTS.md](PROMPTS.md) | Prompts for extending this project with an AI coding assistant |
| [TODO.md](TODO.md) | Roadmap / known gaps |
| [docs/INSTALL.md](docs/INSTALL.md) | Local setup, step by step |
| [docs/DEPLOY.md](docs/DEPLOY.md) | Production deployment |
| [docs/AMOCRM_SETUP.md](docs/AMOCRM_SETUP.md) | Registering the Private Integration + packaging the widget |

## Tech stack

**Frontend:** TypeScript, React 18, Vite, TailwindCSS, shadcn/ui-style components (Radix primitives), Lucide icons, TanStack Query
**Backend:** NestJS, TypeScript, Prisma, PostgreSQL, optional Redis/BullMQ, ExcelJS, Axios, Zod
**Widget:** A small framework-free loader following amoCRM's legacy widget SDK contract

## License

Proprietary — internal project.
