import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('jobs routes are scaffolded', () => {
  const source = fs.readFileSync(new URL('../src/app.ts', import.meta.url), 'utf8');
  assert.match(source, /app\.get\('\/healthz'/);
  assert.match(source, /app\.post\('\/v1\/jobs'/);
  assert.match(source, /app\.get\('\/v1\/jobs\/:token'/);
  assert.match(source, /app\.post\('\/v1\/jobs\/:token\/queue'/);
});


test('queue route persists queued status before enqueueing', () => {
  const source = fs.readFileSync(new URL('../src/app.ts', import.meta.url), 'utf8');
  const routeStart = source.indexOf("app.post('/v1/jobs/:token/queue'");
  const routeEnd = source.indexOf("app.addHook('onClose'", routeStart);
  const routeSource = source.slice(routeStart, routeEnd);

  const addIndex = routeSource.indexOf("await jobsQueue.add('process-job', { jobId: job.id });");
  const updateIndex = routeSource.indexOf("await prisma.job.update({");

  assert.ok(addIndex !== -1, 'Queue add call should exist in queue route');
  assert.ok(updateIndex !== -1, 'Job status update should exist in queue route');
  assert.ok(updateIndex < addIndex, 'Status should be persisted to queued before enqueueing worker job');
});
