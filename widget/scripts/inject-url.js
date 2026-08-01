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

const scriptPath = path.join(__dirname, '..', 'dist', 'script.js');
const source = fs.readFileSync(scriptPath, 'utf8');
const replaced = source.replace('__WIDGET_APP_URL__', widgetUrl);

if (replaced === source) {
  console.error('Placeholder __WIDGET_APP_URL__ not found in dist/script.js — build may have already run.');
  process.exit(1);
}

fs.writeFileSync(scriptPath, replaced);
console.log(`Injected WIDGET_URL=${widgetUrl} into dist/script.js`);

// manifest.json is not compiled by tsc, so it's copied into dist/ here.
// webhook_url may either be a __WEBHOOK_URL__ placeholder (substituted from
// APP_URL below) or already a literal URL committed directly in manifest.json
// — both are supported, so hand-editing manifest.json to a real URL doesn't
// break this step. package-zip.js reads dist/manifest.json.
const manifestSourcePath = path.join(__dirname, '..', 'manifest.json');
const manifestDistPath = path.join(__dirname, '..', 'dist', 'manifest.json');
const manifestSource = fs.readFileSync(manifestSourcePath, 'utf8');

let manifestOutput = manifestSource;
if (manifestSource.includes('__WEBHOOK_URL__')) {
  const appUrl = process.env.APP_URL;
  if (!appUrl) {
    console.error(
      'manifest.json contains the __WEBHOOK_URL__ placeholder but APP_URL is not set. Either set APP_URL ' +
        '(the public URL where /backend is hosted), e.g.\n' +
        '  APP_URL=https://export-api.example.com npm run build\n' +
        'or replace __WEBHOOK_URL__ in manifest.json with a literal URL.',
    );
    process.exit(1);
  }
  const webhookUrl = `${appUrl.replace(/\/$/, '')}/api/webhooks/digital-pipeline`;
  manifestOutput = manifestSource.replace('__WEBHOOK_URL__', webhookUrl);
  console.log(`Injected webhook_url=${webhookUrl} into dist/manifest.json`);
} else {
  console.log('manifest.json has no __WEBHOOK_URL__ placeholder — copying as-is into dist/manifest.json');
}

fs.writeFileSync(manifestDistPath, manifestOutput);
