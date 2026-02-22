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
