# Deploy

There are three things to deploy: the **backend** (NestJS API + PostgreSQL + optional Redis), the **frontend** (a static SPA build), and the **widget** (a small zip uploaded to amoCRM, not "deployed" in the usual sense).

## Backend

The backend is a standard Node/NestJS service — deploy it however you already deploy Node services (a container platform, a VM with a process manager, etc.). There's nothing amoCRM-specific about the deployment target itself.

1. **Build**: `npm run build:shared && npm run build:backend` produces `backend/dist/main.js`.
2. **Runtime**: `node backend/dist/main.js` (or `npm run start:prod -w backend`), with `backend/.env` populated for production — see the variable table in [docs/INSTALL.md](INSTALL.md), plus:
   - `NODE_ENV=production`
   - `APP_URL` / `WIDGET_URL` set to your real public HTTPS URLs
   - `AMOCRM_SUBDOMAIN` / `AMOCRM_LONG_LIVED_TOKEN` — the Private Integration credentials from [AMOCRM_SETUP.md](AMOCRM_SETUP.md); the backend calls `/api/v4/account` with these at boot to auto-register the connected account
   - `CORS_ORIGINS` must include your deployed frontend's origin
   - `DATABASE_URL` pointing at a real, backed-up PostgreSQL instance (not the disposable dev container)
   - `REDIS_URL` if you're running more than one backend instance (required for the BullMQ queue adapter — see ARCHITECTURE.md)
3. **Migrations**: run `npm run prisma:deploy -w backend` as a release step (not `prisma:migrate`, which is interactive/dev-oriented) before starting the new version.
4. **Storage**: `EXPORT_STORAGE_DIR` needs a persistent volume if you're running in a container — generated `.xlsx` files are written there and streamed back on download. If you scale to multiple backend replicas behind a load balancer, either use a shared volume (e.g. NFS/EFS) or put the storage dir on the same instance that will serve the download (sticky routing) — this repo does not implement object storage (S3-style) upload/download, see TODO.md.
5. **Reverse proxy / TLS**: terminate HTTPS in front of the Nest app (nginx, Caddy, your platform's load balancer) — the widget iframe and the amoCRM API calls both require HTTPS in production.

## Frontend

`npm run build:frontend` produces a static `frontend/dist/` you can serve from any static host (nginx, S3+CloudFront, Vercel/Netlify, etc.) — it makes no server-side assumptions beyond calling `VITE_API_URL` at runtime (baked in at build time, so rebuild if the backend URL changes).

**Important**: this SPA is meant to run inside an `<iframe>` opened by the amoCRM widget loader. Make sure your static host does **not** send an `X-Frame-Options` or restrictive `Content-Security-Policy: frame-ancestors` header that would block iframing — if your CDN/host adds one by default, override it to allow framing (or explicitly allow `https://*.amocrm.ru` / `https://*.kommo.com` via `frame-ancestors` if you want to be specific rather than wide open).

## Widget

The widget isn't deployed to your infrastructure at all — it's zipped and uploaded to amoCRM's own widget hosting:

```bash
WIDGET_URL=https://export.yourdomain.com npm run package:widget
```

produces `widget/excel-export-widget.zip`. Upload it per [docs/AMOCRM_SETUP.md](AMOCRM_SETUP.md). Re-run this (with the same `WIDGET_URL`) and re-upload whenever `widget/src/script.ts` changes; you do **not** need to re-upload when only `frontend/` changes, since the loader always points at the same hosted `WIDGET_URL` and the browser always fetches the latest deployed frontend build.

## Release checklist

- [ ] `backend/.env` production values set, especially `JWT_SECRET` (generate a fresh one — don't reuse the dev value) and a real `AMOCRM_LONG_LIVED_TOKEN`
- [ ] `npm run prisma:deploy -w backend` run against the production database
- [ ] Backend logs `amoCRM account <id> (<subdomain>) registered from long-lived token` on startup (not the "Could not verify" warning — see [AMOCRM_SETUP.md](AMOCRM_SETUP.md))
- [ ] Frontend built with `VITE_API_URL` pointing at the production backend, and deployed without a framing-blocking header
- [ ] Widget packaged with `WIDGET_URL` pointing at the production frontend, uploaded to amoCRM
- [ ] A real export completed against the connected amoCRM account before wider rollout (see TODO.md — this has not been done in this repo's build/verification pass)
