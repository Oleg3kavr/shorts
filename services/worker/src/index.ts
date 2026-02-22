import { prisma } from '@shorts/db';
import { Worker } from 'bullmq';
import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function startWorker() {
  const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });

  const worker = new Worker<{ jobId: string }>(
    'jobs',
    async (queueJob) => {
      const { jobId } = queueJob.data;

      try {
        await prisma.job.update({
          where: { id: jobId },
          data: { status: 'processing', error: null }
        });

        const delayMs = 2000 + Math.floor(Math.random() * 3000);
        await sleep(delayMs);

        await prisma.job.update({
          where: { id: jobId },
          data: { status: 'done' }
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown worker error';
        await prisma.job.update({
          where: { id: jobId },
          data: { status: 'failed', error: message }
        });
        throw error;
      }
    },
    { connection }
  );

  worker.on('ready', () => {
    console.log('worker started');
  });

  return worker;
}

if (process.env.NODE_ENV !== 'test') {
  startWorker();
}
