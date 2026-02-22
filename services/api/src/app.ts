import { prisma } from '@shorts/db';
import { createJobResponseSchema, jobStatusResponseSchema } from '@shorts/shared';
import { Queue } from 'bullmq';
import Fastify from 'fastify';
import { Redis } from 'ioredis';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import { createPresignedGetUrl, createPresignedPutUrl } from './storage.js';

const MAX_UPLOAD_SIZE_BYTES = 1024 * 1024 * 500;
const ALLOWED_MIME_TYPES = new Set(['video/mp4', 'video/quicktime', 'video/x-matroska', 'video/webm']);

const presignUploadRequestSchema = z.object({
  filename: z.string().min(1),
  contentType: z.string().min(1),
  sizeBytes: z.number().int().positive().max(MAX_UPLOAD_SIZE_BYTES),
  jobToken: z.string().min(1).optional()
});

const attachInputRequestSchema = z.object({
  inputKey: z.string().min(1)
});

function sanitizeFilename(filename: string) {
  return filename
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120) || 'upload.bin';
}

type BuildAppOptions = {
  redisUrl?: string;
};

export function buildApp(options: BuildAppOptions = {}) {
  const app = Fastify();
  const redisUrl = options.redisUrl ?? process.env.REDIS_URL ?? 'redis://localhost:6379';
  const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });
  const jobsQueue = new Queue('jobs', { connection });

  app.get('/healthz', async () => ({ status: 'ok' }));

  app.post('/v1/jobs', async () => {
    const token = nanoid(16);
    const job = await prisma.job.create({
      data: {
        token,
        status: 'created'
      }
    });

    return createJobResponseSchema.parse({ token: job.token, status: job.status });
  });

  app.post('/v1/uploads/presign', async (request, reply) => {
    const parseResult = presignUploadRequestSchema.safeParse(request.body);

    if (!parseResult.success) {
      return reply.status(400).send({
        message: 'Invalid upload payload',
        issues: parseResult.error.issues
      });
    }

    const { filename, contentType, sizeBytes, jobToken } = parseResult.data;

    if (!ALLOWED_MIME_TYPES.has(contentType)) {
      return reply.status(400).send({ message: 'Unsupported content type' });
    }

    const sanitizedFilename = sanitizeFilename(filename);
    const scope = jobToken ?? 'temp';
    const key = `inputs/${scope}/${nanoid(12)}/${sanitizedFilename}`;
    const uploadUrl = await createPresignedPutUrl(key, contentType, sizeBytes);

    return { key, uploadUrl };
  });

  app.get('/v1/jobs/:token', async (request, reply) => {
    const { token } = request.params as { token: string };
    const job = await prisma.job.findUnique({
      where: { token },
      include: { artifacts: { orderBy: { createdAt: 'asc' } } }
    });

    if (!job) {
      return reply.status(404).send({ message: 'Job not found' });
    }

    const artifacts = await Promise.all(
      job.artifacts.map(async (artifact) => ({
        id: artifact.id,
        type: artifact.type,
        key: artifact.key,
        title: artifact.title,
        startSec: artifact.startSec,
        endSec: artifact.endSec,
        createdAt: artifact.createdAt.toISOString(),
        downloadUrl: await createPresignedGetUrl(artifact.key)
      }))
    );

    return jobStatusResponseSchema.parse({
      token: job.token,
      status: job.status,
      inputKey: job.inputKey,
      error: job.error,
      artifacts
    });
  });

  app.post('/v1/jobs/:token/attach-input', async (request, reply) => {
    const { token } = request.params as { token: string };
    const parseResult = attachInputRequestSchema.safeParse(request.body);

    if (!parseResult.success) {
      return reply.status(400).send({
        message: 'Invalid attach-input payload',
        issues: parseResult.error.issues
      });
    }

    const job = await prisma.job.findUnique({ where: { token } });

    if (!job) {
      return reply.status(404).send({ message: 'Job not found' });
    }

    await prisma.job.update({
      where: { id: job.id },
      data: { inputKey: parseResult.data.inputKey }
    });

    return { ok: true };
  });

  app.post('/v1/jobs/:token/queue', async (request, reply) => {
    const { token } = request.params as { token: string };
    const job = await prisma.job.findUnique({ where: { token } });

    if (!job) {
      return reply.status(404).send({ message: 'Job not found' });
    }

    const updatedJob = await prisma.job.update({
      where: { id: job.id },
      data: { status: 'queued', error: null }
    });

    await jobsQueue.add('process-job', { jobId: updatedJob.id });

    return { ok: true };
  });

  app.addHook('onClose', async () => {
    await jobsQueue.close();
    await connection.quit();
  });

  return app;
}
