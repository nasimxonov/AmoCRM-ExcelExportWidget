#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const archiver = require('archiver');

const root = path.join(__dirname, '..');
const outputPath = path.join(root, 'excel-export-widget.zip');

const output = fs.createWriteStream(outputPath);
const archive = archiver('zip', { zlib: { level: 9 } });

output.on('close', () => {
  console.log(`Packaged ${archive.pointer()} bytes -> ${outputPath}`);
  console.log('Upload this zip in your amoCRM developer account under Widgets > Add widget.');
});

archive.on('warning', (err) => {
  throw err;
});
archive.on('error', (err) => {
  throw err;
});

archive.pipe(output);
archive.file(path.join(root, 'dist', 'manifest.json'), { name: 'manifest.json' });
archive.file(path.join(root, 'dist', 'script.js'), { name: 'script.js' });
archive.directory(path.join(root, 'i18n'), 'i18n');

const imagesDir = path.join(root, 'images');
if (fs.existsSync(imagesDir)) {
  archive.directory(imagesDir, 'images');
}

archive.finalize();
