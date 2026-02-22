import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('healthz route is scaffolded', () => {
  const source = fs.readFileSync(new URL('../src/app.ts', import.meta.url), 'utf8');
  assert.match(source, /app\.get\('\/healthz'/);
  assert.match(source, /status: 'ok'/);
});
