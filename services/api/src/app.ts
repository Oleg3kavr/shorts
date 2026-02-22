import { prisma } from '@shorts/db';
import { createJobResponseSchema, jobStatusResponseSchema } from '@shorts/shared';
import { Queue } from 'bullmq';
import Fastify from 'fastify';
import { Redis } from 'ioredis';
import { nanoid } from 'nanoid';

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

  app.get('/v1/jobs/:token', async (request, reply) => {
    const { token } = request.params as { token: string };
    const job = await prisma.job.findUnique({
      where: { token },
      include: { artifacts: { orderBy: { createdAt: 'asc' } } }
    });

    if (!job) {
      return reply.status(404).send({ message: 'Job not found' });
    }

    return jobStatusResponseSchema.parse({
      token: job.token,
      status: job.status,
      inputKey: job.inputKey,
      error: job.error,
      artifacts: job.artifacts.map((artifact) => ({
        id: artifact.id,
        type: artifact.type,
        key: artifact.key,
        title: artifact.title,
        startSec: artifact.startSec,
        endSec: artifact.endSec,
        createdAt: artifact.createdAt.toISOString()
      }))
    });
  });

  app.post('/v1/jobs/:token/queue', async (request, reply) => {
    const { token } = request.params as { token: string };
    const job = await prisma.job.findUnique({ where: { token } });

    if (!job) {
      return reply.status(404).send({ message: 'Job not found' });
    }

    const queuedJob = await prisma.job.updateMany({
      where: {
        id: job.id,
        status: {
          in: ['created', 'queued', 'failed']
        }
      },
      data: { status: 'queued', error: null }
    });

    if (queuedJob.count === 0) {
      return reply.status(409).send({ message: 'Job is already being processed' });
    }

    await jobsQueue.add(
      'process-job',
      { jobId: job.id },
      { jobId: job.id }
    );

    return { ok: true };
  });

  app.addHook('onClose', async () => {
    await jobsQueue.close();
    await connection.quit();
  });

  return app;
}
