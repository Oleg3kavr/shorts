import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('jobs routes are scaffolded', () => {
  const source = fs.readFileSync(new URL('../src/app.ts', import.meta.url), 'utf8');
  assert.match(source, /app\.get\('\/healthz'/);
  assert.match(source, /app\.post\('\/v1\/jobs'/);
  assert.match(source, /app\.post\('\/v1\/uploads\/presign'/);
  assert.match(source, /app\.post\('\/v1\/jobs\/:token\/attach-input'/);
  assert.match(source, /app\.get\('\/v1\/jobs\/:token'/);
  assert.match(source, /app\.post\('\/v1\/jobs\/:token\/queue'/);
});

test('presign route passes declared file size to storage signing', () => {
  const source = fs.readFileSync(new URL('../src/app.ts', import.meta.url), 'utf8');
  assert.match(source, /createPresignedPutUrl\(key, contentType, sizeBytes\)/);
});

test('storage client is initialized lazily and signs content length', () => {
  const source = fs.readFileSync(new URL('../src/storage.ts', import.meta.url), 'utf8');
  assert.match(source, /function getStorageClient\(\)/);
  assert.match(source, /ContentLength: sizeBytes/);
});
