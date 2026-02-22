import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('db package exports prisma singleton', () => {
  const source = fs.readFileSync(new URL('../src/index.ts', import.meta.url), 'utf8');
  assert.match(source, /new PrismaClient/);
  assert.match(source, /export const prisma/);
});
