# amoCRM (Kommo) Setup

How to register this integration with amoCRM/Kommo and connect your account. This project authenticates using a **Private Integration long-lived token** — see the official docs at [developers.kommo.com/docs/private-integration](https://developers.kommo.com/docs/private-integration) and [developers.kommo.com/docs/long-lived-token](https://developers.kommo.com/docs/long-lived-token). This replaces the OAuth2 authorization-code flow the widget marketplace requires for publicly listed integrations — a private, self-installed, single-account integration like this one doesn't need it.

## 1. Create a Private Integration

In your amoCRM/Kommo account (as an administrator): **Settings → Integrations → Create integration**.

- **Name** / **Description** — internal only, not shown to other users
- Check **Private** (this ties the integration to your single account and skips marketplace moderation)
- **Scopes** — grant read/write access to Leads, Contacts, Companies (for the export API calls) and read access to the account/users/pipelines endpoints (for the meta lookups in `ReferenceDataService`)
- Leave the **Redirect URL** field blank — it's only used by the OAuth authorization-code flow, which this integration does not use

## 2. Generate a long-lived token

After saving the integration, open its **Keys and scopes** tab and click **Generate long-lived token**:

1. Choose an expiration (1 day to 5 years — pick something you're comfortable rotating manually before it lapses; there is no refresh token)
2. Copy the token immediately — amoCRM will not show it to you again
3. Put it in `backend/.env` as `AMOCRM_LONG_LIVED_TOKEN`
4. Put your account's subdomain (the part before `.amocrm.ru`, e.g. `yourcompany` for `yourcompany.amocrm.ru`) in `backend/.env` as `AMOCRM_SUBDOMAIN`

That's the entire credential set the backend needs — there's no client id/secret, no redirect URI, and no install/consent step to drive. On boot, `AmoCrmAccountBootstrapService` calls `GET /api/v4/account` with this token to resolve which account it belongs to and caches it locally (see [DATABASE.md](../DATABASE.md)).

> The integration form's **Keys and scopes** tab also shows an **Integration ID**, **Secret key** and **Authorization code**. Those exist to support the OAuth-style exchange for integrations that need it; this project doesn't use them since the long-lived token alone is sufficient for API access — see the "Key distinction" section of the private-integration docs linked above.

## 3. Build and upload the widget

```bash
WIDGET_URL=https://export.yourdomain.com APP_URL=https://export-api.yourdomain.com npm run package:widget
```

This produces `widget/excel-export-widget.zip`. In amoCRM/Kommo: **Settings → Integrations → your integration → Widgets → Add widget** (or the equivalent path in your developer console version), upload the zip.

The zip contains:
- `manifest.json` — widget metadata (name, version, supported locales), plus `digital_pipeline` in `locations`/a `dp` settings block and `webhook_url` (baked in from `APP_URL`) for the Digital Pipeline → Google Sheets export trigger — see [WIDGET.md](../WIDGET.md#digital-pipeline-trigger-google-sheets-export) and [GOOGLE_SHEETS_SETUP.md](GOOGLE_SHEETS_SETUP.md)
- `script.js` — the loader, with `WIDGET_URL` baked in (see [WIDGET.md](../WIDGET.md#building-and-packaging))
- `i18n/en/config.json`, `i18n/ru/config.json` — localized strings

> `widget/manifest.json` in this repo is a minimal, best-effort manifest. Cross-check the current required fields in your developer console before uploading — a private integration typically has looser requirements than a publicly listed one.

## 4. Verify

Start the backend with `AMOCRM_SUBDOMAIN`/`AMOCRM_LONG_LIVED_TOKEN` set — it should log `amoCRM account <id> (<subdomain>) registered from long-lived token` at boot. If you instead see a `Could not verify amoCRM account ... Continuing without an auto-registered account` warning, double-check the subdomain and token — `POST /api/auth/session` will 401 for every real account until this succeeds (the backend still boots regardless, so local/UI-only development isn't blocked by a placeholder token — see [docs/INSTALL.md](../docs/INSTALL.md)).

Then open the account's leads/contacts/companies list — the widget loader's `init()` callback should inject an "Export to Excel" button (see [WIDGET.md](../WIDGET.md) for where it looks for a toolbar to attach to, and what to check if it doesn't appear). Clicking it should open the export modal with your account's real pipelines/statuses/users populated in the filter dropdowns.

## 5. Rotating/revoking access

- **Rotating the token**: generate a new long-lived token from the same **Keys and scopes** tab, update `AMOCRM_LONG_LIVED_TOKEN` in `backend/.env`, and restart the backend. No database migration or re-install step is needed — it's a stateless env var swap.
- **Revoking access**: an administrator can revoke the token from the integration's **Authorization** tab at any time. Once revoked, `AmoCrmHttpClient` calls will start failing with `401`s (exhausting their retry budget and marking export jobs `failed`), and the next backend restart's boot-time check will log the warning above instead of registering the account.
