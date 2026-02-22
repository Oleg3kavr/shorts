import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('shared schemas exist', () => {
  const source = fs.readFileSync(new URL('../src/index.ts', import.meta.url), 'utf8');
  assert.match(source, /uploadRequestSchema/);
  assert.match(source, /createJobResponseSchema/);
  assert.match(source, /jobStatusResponseSchema/);
  assert.match(source, /downloadUrl/);
});
