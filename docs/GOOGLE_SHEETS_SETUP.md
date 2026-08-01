# Google Sheets Setup (Digital Pipeline export)

How to configure Google OAuth so amoCRM accounts can connect a Google account and export lead data to a Google Sheet via a Digital Pipeline trigger. This is a genuinely separate credential set from [docs/AMOCRM_SETUP.md](AMOCRM_SETUP.md) — amoCRM auth stays a Private Integration long-lived token; this is a standard Google OAuth 2.0 Web client, because each connected amoCRM account authorizes its *own* Google account (see ARCHITECTURE.md's Digital Pipeline section).

## 1. Create a Google Cloud project and enable the Sheets API

1. [console.cloud.google.com](https://console.cloud.google.com) → create (or reuse) a project.
2. **APIs & Services → Library** → enable **Google Sheets API**.

## 2. Configure the OAuth consent screen

**APIs & Services → OAuth consent screen**:
- User type: **External** (unless every connecting Google account is a Workspace user in the same org, in which case Internal is simpler and skips verification entirely)
- Scopes: add `https://www.googleapis.com/auth/spreadsheets` and `.../auth/userinfo.email`
- Add test users while in development — Google caps unverified external apps at ~100 test users

> **Production/multi-tenant caveat**: the `spreadsheets` scope is a Google-classified "sensitive" scope. Before this can be used by real customers beyond the ~100 test-user cap, Google requires an app verification review (and, depending on scope classification, a CASA security assessment). This is not something this codebase can do for you — budget time for it before a public rollout. Tracked in [TODO.md](../TODO.md).

## 3. Create an OAuth 2.0 Client ID

**APIs & Services → Credentials → Create Credentials → OAuth client ID**:
- Application type: **Web application**
- Authorized redirect URI: `${APP_URL}/api/google/oauth/callback` (e.g. `https://export-api.yourdomain.com/api/google/oauth/callback`) — must match `GOOGLE_OAUTH_REDIRECT_URI` / the derived default exactly, including scheme and trailing slash.

Copy the generated **Client ID** and **Client secret**.

## 4. Configure the backend

In `backend/.env`:

```bash
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
# Leave empty to default to ${APP_URL}/api/google/oauth/callback
GOOGLE_OAUTH_REDIRECT_URI=
# 32-byte key (64 hex chars) used to encrypt stored refresh/access tokens at rest
GOOGLE_TOKEN_ENCRYPTION_KEY=$(openssl rand -hex 32)
```

## 5. Connect an account

From the amoCRM account: open the widget from **Settings → Integrations → your widget** (this fires the loader's `callbacks.settings`, which opens a "Google Sheets" settings panel — see WIDGET.md). Click **Connect Google Account**; it opens Google's consent screen in a new tab (Google blocks OAuth consent screens from rendering inside an iframe, so this can't reuse the export modal's iframe). After granting access, the tab shows a "you can close this tab" confirmation and the settings panel flips to "Connected".

## 6. Set up a Digital Pipeline trigger

In a pipeline's stage settings → **Добавить триггер** → the widget should now appear alongside "Salesbot"/"API" (requires `digital_pipeline` in `manifest.json`'s `locations` and re-uploading the widget package — see [docs/AMOCRM_SETUP.md](AMOCRM_SETUP.md#3-build-and-upload-the-widget)). Configure:
- **Google Sheet URL** — the full `https://docs.google.com/spreadsheets/d/…` URL. Share edit access with the connected Google account if the sheet lives in a different Google account/Workspace.
- **Sheet name** — the tab name within that spreadsheet (created automatically if the connected account has edit access; the trigger does not create new tabs).
- **Field codes** (optional) — comma-separated amoCRM custom field codes/names/ids to add as extra columns.

> The exact JSON amoCRM expects back from `webhook_url` on a trigger fire isn't documented anywhere in this repo and hasn't been verified against a live account — see the caveat in WIDGET.md. If triggers appear to fire but the row never lands in Sheets, check the backend logs first (`DigitalPipelineService` logs every rejection reason).

## 7. Rotating/revoking access

- **Client secret rotation**: generate a new client secret in Google Cloud Console, update `GOOGLE_CLIENT_SECRET`, restart the backend. Existing connected accounts' refresh tokens keep working (they're tied to the client ID, not the secret's specific value, until the old secret is deleted in the console).
- **A customer disconnecting**: the "Disconnect Google Account" button in the settings panel deletes the stored token; per-account, no backend restart needed.
- **You revoking everyone**: rotate `GOOGLE_TOKEN_ENCRYPTION_KEY` — this makes all stored tokens undecryptable, effectively disconnecting every account at once. There's no bulk revoke-via-Google-API call implemented; do that manually in Google Cloud Console's "OAuth consent screen → App access" if you need Google itself to invalidate the tokens.
