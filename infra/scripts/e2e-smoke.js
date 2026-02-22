#!/usr/bin/env node

const API_BASE_URL = process.env.API_BASE_URL ?? 'http://api:8000';
const HEALTHCHECK_TIMEOUT_MS = Number(process.env.HEALTHCHECK_TIMEOUT_MS ?? 120_000);
const DONE_TIMEOUT_MS = Number(process.env.DONE_TIMEOUT_MS ?? 120_000);
const POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS ?? 2_000);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function requestJson(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'content-type': 'application/json',
      ...(options.headers ?? {})
    }
  });

  const text = await response.text();
  const body = text ? safeJsonParse(text) : null;

  if (!response.ok) {
    throw new Error(
      `Request failed ${options.method ?? 'GET'} ${path} (${response.status}): ${text || response.statusText}`
    );
  }

  return body;
}

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function createSampleMp4Buffer() {
  const payload = Buffer.from('tiny smoke video payload', 'utf8');
  const ftyp = Buffer.from([
    0x00, 0x00, 0x00, 0x18,
    0x66, 0x74, 0x79, 0x70,
    0x69, 0x73, 0x6f, 0x6d,
    0x00, 0x00, 0x02, 0x00,
    0x69, 0x73, 0x6f, 0x6d,
    0x69, 0x73, 0x6f, 0x32
  ]);

  return Buffer.concat([ftyp, payload]);
}

async function waitForHealthz() {
  const start = Date.now();
  let lastError = null;

  while (Date.now() - start < HEALTHCHECK_TIMEOUT_MS) {
    try {
      const health = await requestJson('/healthz');
      if (health?.status === 'ok') {
        console.log('healthz ready');
        return;
      }

      lastError = new Error(`Unexpected /healthz response: ${JSON.stringify(health)}`);
    } catch (error) {
      lastError = error;
    }

    await sleep(1_000);
  }

  throw new Error(`Timed out waiting for /healthz: ${lastError ? String(lastError) : 'unknown error'}`);
}

async function uploadToPresignedUrl(uploadUrl, fileBuffer, contentType) {
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'content-type': contentType,
      'content-length': String(fileBuffer.byteLength)
    },
    body: fileBuffer
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Presigned upload failed (${response.status}): ${text || response.statusText}`);
  }
}

async function pollUntilDone(token) {
  const start = Date.now();
  let lastStatus = 'unknown';

  while (Date.now() - start < DONE_TIMEOUT_MS) {
    const statusResponse = await requestJson(`/v1/jobs/${token}`);
    lastStatus = statusResponse?.status ?? 'missing';
    console.log(`job ${token} status=${lastStatus}`);

    if (lastStatus === 'done') {
      return statusResponse;
    }

    if (lastStatus === 'failed') {
      throw new Error(`Job ${token} failed: ${statusResponse?.error ?? 'unknown worker error'}`);
    }

    await sleep(POLL_INTERVAL_MS);
  }

  throw new Error(`Timed out waiting for done status. Last status: ${lastStatus}`);
}

async function main() {
  console.log(`Starting smoke test against ${API_BASE_URL}`);

  await waitForHealthz();

  const createdJob = await requestJson('/v1/jobs', { method: 'POST' });
  const token = createdJob?.token;
  if (!token) {
    throw new Error(`Missing token from /v1/jobs response: ${JSON.stringify(createdJob)}`);
  }
  console.log(`created job token=${token}`);

  const sample = createSampleMp4Buffer();
  const contentType = 'video/mp4';

  const presignResponse = await requestJson('/v1/uploads/presign', {
    method: 'POST',
    body: JSON.stringify({
      filename: 'smoke-sample.mp4',
      contentType,
      sizeBytes: sample.byteLength,
      jobToken: token
    })
  });

  const uploadUrl = presignResponse?.uploadUrl;
  const key = presignResponse?.key;
  if (!uploadUrl || !key) {
    throw new Error(`Invalid presign response: ${JSON.stringify(presignResponse)}`);
  }
  console.log(`presigned key=${key}`);

  await uploadToPresignedUrl(uploadUrl, sample, contentType);
  console.log('upload complete');

  await requestJson(`/v1/jobs/${token}/attach-input`, {
    method: 'POST',
    body: JSON.stringify({ inputKey: key })
  });
  console.log('input attached');

  await requestJson(`/v1/jobs/${token}/queue`, { method: 'POST' });
  console.log('job queued');

  const finalStatus = await pollUntilDone(token);
  console.log('smoke test passed', JSON.stringify({ token, status: finalStatus?.status }));
}

main().catch((error) => {
  console.error('e2e smoke test failed');
  console.error(error?.stack ?? error);
  process.exitCode = 1;
});
