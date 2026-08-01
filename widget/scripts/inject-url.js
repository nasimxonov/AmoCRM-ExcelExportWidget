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
