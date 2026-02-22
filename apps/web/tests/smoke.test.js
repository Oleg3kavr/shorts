const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('web workspace smoke test', () => {
  assert.equal(1 + 1, 2);
});

test('upload page queues job after attaching input', () => {
  const source = fs.readFileSync('app/upload/page.tsx', 'utf8');
  assert.match(source, /\/v1\/jobs\/\$\{createdJob\.token\}\/attach-input/);
  assert.match(source, /\/v1\/jobs\/\$\{createdJob\.token\}\/queue/);
});
