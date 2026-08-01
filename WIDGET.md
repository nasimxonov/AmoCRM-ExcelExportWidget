# Widget Lifecycle

This document covers the `widget/` package specifically — the code that actually runs inside amoCRM. For the overall system shape, see [ARCHITECTURE.md](ARCHITECTURE.md).

## The two halves

| Piece | Where it runs | What it's for |
|---|---|---|
| `widget/src/script.ts` | Directly inside the amoCRM account page | Registers with amoCRM's widget lifecycle, adds an "Export to Excel" trigger, opens the modal |
| `frontend/` | An iframe the loader opens | The actual export configuration UI (React/Tailwind) |

## amoCRM widget lifecycle contract

amoCRM's legacy widget runtime loads `script.js` (built from `script.ts`) via an AMD `define(['jquery'], factory)` call and expects the factory to return an object with a `callbacks` property:

```ts
{
  render: () => boolean,        // called when the widget's own settings/card view renders
  init: () => boolean,          // called once when the widget is activated for the account
  bind_actions: () => boolean,  // called to attach DOM event handlers
  settings: () => boolean,      // called when the widget's settings modal opens
  onSave: () => boolean,        // called when settings are saved
  destroy: () => boolean,       // called when the widget is deactivated
}
```

This widget uses `init()` to inject the trigger button and `destroy()` to remove it and close any open modal. `render`/`bind_actions`/`settings`/`onSave` are no-ops (return `true`) since there is no persistent settings UI to manage — configuration happens per-export in the iframe, not per-install.

> **Note on API stability**: amoCRM's widget platform documentation and internal markup have changed over the years, and this project was built without access to a live amoCRM sandbox to verify against. The lifecycle contract above (the `define(...)` + `callbacks` shape) is the long-standing, well-documented pattern. Two things you should verify against a real account before shipping, both called out in `widget/src/script.ts`:
>
> 1. **Selected-row detection** (`detectSelectedIds()`) — tries a few known CSS selector patterns for "checked" rows in the leads/contacts/companies list. If amoCRM's current markup doesn't match, "Export selected records" will show 0 selected; "Export filtered/all" still work regardless.
> 2. **Trigger button placement** (`injectTriggerButton()`) — looks for `.control-bar__group` / `.js-control-bar-actions`; falls back to appending to `document` if neither is found (which will render an unstyled button, functional but ugly). Adjust the selector to wherever your account's toolbar actually lives.

## The account/user/entity handshake

The iframe the loader opens has no way to call back into amoCRM's own JS globals (different origin, sandboxed). So all context it needs is passed once, as URL query parameters, when the modal is opened:

```
${WIDGET_URL}?accountId=12345678&subdomain=yourcompany&userId=42&entityType=leads&selectedIds=101,102,103
```

`frontend/src/lib/amocrm-context.ts` reads these on mount. `frontend/src/hooks/use-widget-session.ts` immediately exchanges them for a backend-issued JWT via `POST /api/auth/session` (see [API.md](API.md)) — that endpoint checks the account matches the one connected via the Private Integration long-lived token (see below) before issuing a token, so a forged query string still can't call the export API without a real, connected account existing server-side.

## Connecting the account (Private Integration)

There is no per-account install flow to drive from the widget side. This project connects to exactly one amoCRM account, configured once via `AMOCRM_SUBDOMAIN` / `AMOCRM_LONG_LIVED_TOKEN` (see [docs/AMOCRM_SETUP.md](docs/AMOCRM_SETUP.md)):

1. An administrator generates a long-lived token from the Private Integration's "Keys and scopes" tab and puts it (plus the subdomain) in `backend/.env`.
2. On backend startup, `AmoCrmAccountBootstrapService` calls `GET /api/v4/account` with that token and upserts the resulting id/subdomain into the `AmoAccount` table.
3. From then on, whenever the widget loader opens the iframe (step above), `POST /api/auth/session` succeeds for that account because it's registered.

Rotating or revoking the token is a config change + restart, not a re-install — see [docs/AMOCRM_SETUP.md](docs/AMOCRM_SETUP.md#5-rotatingrevoking-access).

## Digital Pipeline trigger (Google Sheets export)

Alongside the manual "Export to Excel" flow, `manifest.json` also declares `"digital_pipeline"` in `locations` plus a `dp` block, so the widget appears as an option in a pipeline stage's **Добавить триггер** modal (next to "Salesbot", "Создать задачу", "API", etc.):

```json
"dp": {
  "settings": {
    "spreadsheet_url": { "name": "settings.spreadsheet_url", "type": "text", "required": true },
    "sheet_name": { "name": "settings.sheet_name", "type": "text", "required": true },
    "field_codes": { "name": "settings.field_codes", "type": "textarea", "required": false }
  },
  "action_multiple": false
}
```

The quick-setup form for these fields (text/textarea inputs) is rendered by amoCRM itself from this declarative schema — that's the documented, standard mechanism. This project deliberately does **not** implement a custom JS `dpSettings()`-style callback in `script.ts` for this: there's no reliable documentation of such a callback's exact contract in this codebase's research, and shipping speculative code against an unconfirmed API is worse than relying on the declarative path that's actually documented.

When the trigger fires, amoCRM POSTs to the manifest's `webhook_url` (substituted at build time from `APP_URL`, see below) with a payload roughly shaped like:

```json
{
  "event": { "type": 14, "type_code": "lead_status_changed", "data": { "id": 123, "element_type": 2, "status_id": 1, "pipeline_id": 1 }, "time": 1700000000 },
  "action": { "settings": { "widget": { "settings": { "spreadsheet_url": "...", "sheet_name": "...", "field_codes": "..." } } } },
  "subdomain": "yourcompany",
  "account_id": 12345678
}
```

`backend/src/digital-pipeline/digital-pipeline.controller.ts` validates this against `digitalPipelineWebhookSchema` (shared package), looks up the connected `AmoAccount` and `GoogleAccount`, fetches the lead via the existing `LeadsRepository`, and appends a row via `GoogleSheetsService` — see [docs/GOOGLE_SHEETS_SETUP.md](docs/GOOGLE_SHEETS_SETUP.md) for the Google OAuth setup this depends on.

> **Unverified**: neither the exact ack JSON amoCRM expects back from `webhook_url`, nor whether declarative `dp.settings` alone is sufficient to render the quick-setup form (vs. requiring some additional callback), has been confirmed against a live amoCRM account — this codebase was built without one, same caveat as the rest of this file. `DigitalPipelineController` currently responds `{"success": true}` / HTTP 200 as a best-effort placeholder. Verify both after uploading the widget and adjust if amoCRM's real behavior differs.

The "Connect Google Account" UI is opened via the loader's `settings()` callback (previously a no-op — now opens the same overlay/iframe mechanism as the export button, pointed at `?view=settings`), landing on `frontend/src/components/settings/google-settings-panel.tsx`.

## Closing the modal

The loader listens for `window.postMessage({ type: 'amocrm-excel-export:close' })` from the iframe (from any origin — it's just a close signal, not sensitive data) and removes the overlay. The frontend sends this when the user clicks the close (✕) button in its header (only rendered when `window.parent !== window`, i.e. when actually embedded). The loader also closes on `Escape` and on backdrop click, independent of the iframe.

## Building and packaging

```bash
WIDGET_URL=https://export.yourdomain.com APP_URL=https://export-api.yourdomain.com npm run package:widget
```

Produces `widget/excel-export-widget.zip` containing `script.js` (with the `WIDGET_URL` placeholder substituted in) and `manifest.json` (with the `APP_URL`-derived `webhook_url` placeholder substituted in — copied from the root `manifest.json` template into `dist/manifest.json` so the checked-in source stays environment-agnostic), plus `i18n/{en,ru}/config.json`. Upload that zip in your amoCRM developer account under **Widgets → Add widget**. See [docs/AMOCRM_SETUP.md](docs/AMOCRM_SETUP.md) for the full walkthrough including required manifest fields, which may need adjusting to match the current amoCRM developer console at the time you publish.
