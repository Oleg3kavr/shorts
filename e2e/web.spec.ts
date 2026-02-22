import { expect, test } from '@playwright/test';

test.setTimeout(180_000);

test('uploads a file through the browser and reaches done status without CORS failures', async ({ page, request }) => {
  const consoleErrors: string[] = [];

  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text());
    }
  });

  await page.goto('http://web:3000/upload', { waitUntil: 'networkidle' });

  const uploadInput = page.locator('input[type="file"]');
  await expect(uploadInput).toBeVisible();

  const fakeMp4 = Buffer.concat([
    Buffer.from('000000186674797069736f6d0000020069736f6d69736f32', 'hex'),
    Buffer.from('playwright-generated-mp4-fixture')
  ]);

  await uploadInput.setInputFiles({
    name: 'playwright-smoke.mp4',
    mimeType: 'video/mp4',
    buffer: fakeMp4
  });

  await page.getByRole('button', { name: /upload & create job/i }).click();
  await page.waitForURL(/\/jobs\/[A-Za-z0-9_-]+$/);

  const jobUrl = new URL(page.url());
  const token = jobUrl.pathname.split('/').at(-1);

  expect(token).toBeTruthy();

  const queueResponse = await request.post(`http://api:8000/v1/jobs/${token}/queue`);
  expect(queueResponse.ok()).toBeTruthy();

  const statusLine = page.getByText(/^Status:/);
  await expect(statusLine).toContainText(/done/i, { timeout: 120_000 });

  const inputKeyLine = page.getByText(/^Input key:/);
  await expect(inputKeyLine).not.toContainText('Not attached yet');

  const artifactLinks = page.locator('ul li a');
  const artifactCount = await artifactLinks.count();

  if (artifactCount === 0) {
    const statusResponse = await request.get(`http://api:8000/v1/jobs/${token}`);
    expect(statusResponse.ok()).toBeTruthy();

    const payload = await statusResponse.json();
    expect(payload.status).toBe('done');
    expect(payload.inputKey).toBeTruthy();
  } else {
    await expect(artifactLinks.first()).toBeVisible();
  }

  expect(consoleErrors, `Console errors found:\n${consoleErrors.join('\n')}`).toEqual(
    expect.not.arrayContaining([expect.stringMatching(/cors/i)])
  );
});
