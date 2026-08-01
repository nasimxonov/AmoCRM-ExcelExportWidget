#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const widgetUrl = process.env.WIDGET_URL;
if (!widgetUrl) {
  console.error(
    'WIDGET_URL environment variable is required (the public URL where /frontend is hosted), e.g.\n' +
      '  WIDGET_URL=https://export.example.com npm run build',
  );
  process.exit(1);
}

const appUrl = process.env.APP_URL;
if (!appUrl) {
  console.error(
    'APP_URL environment variable is required (the public URL where /backend is hosted, used for the ' +
      'Digital Pipeline webhook_url), e.g.\n' +
      '  APP_URL=https://export-api.example.com npm run build',
  );
  process.exit(1);
}

const scriptPath = path.join(__dirname, '..', 'dist', 'script.js');
const source = fs.readFileSync(scriptPath, 'utf8');
const replaced = source.replace('__WIDGET_APP_URL__', widgetUrl);

if (replaced === source) {
  console.error('Placeholder __WIDGET_APP_URL__ not found in dist/script.js — build may have already run.');
  process.exit(1);
}

fs.writeFileSync(scriptPath, replaced);
console.log(`Injected WIDGET_URL=${widgetUrl} into dist/script.js`);

// manifest.json is not compiled by tsc, so it's copied (with substitution) into
// dist/ here rather than mutated in place — keeps the checked-in manifest.json
// a clean, environment-agnostic template. package-zip.js reads dist/manifest.json.
const webhookUrl = `${appUrl.replace(/\/$/, '')}/api/webhooks/digital-pipeline`;
const manifestSourcePath = path.join(__dirname, '..', 'manifest.json');
const manifestDistPath = path.join(__dirname, '..', 'dist', 'manifest.json');
const manifestSource = fs.readFileSync(manifestSourcePath, 'utf8');
const manifestReplaced = manifestSource.replace('__WEBHOOK_URL__', webhookUrl);

if (manifestReplaced === manifestSource) {
  console.error('Placeholder __WEBHOOK_URL__ not found in manifest.json.');
  process.exit(1);
}

fs.writeFileSync(manifestDistPath, manifestReplaced);
console.log(`Injected webhook_url=${webhookUrl} into dist/manifest.json`);
