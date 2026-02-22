import { z } from 'zod';

export const uploadRequestSchema = z.object({
  filename: z.string().min(1),
  mimeType: z.string().min(1)
});

export const createJobResponseSchema = z.object({
  token: z.string().min(1),
  status: z.string().min(1)
});

export const artifactSchema = z.object({
  id: z.string().uuid(),
  type: z.string().min(1),
  key: z.string().min(1),
  title: z.string().nullable(),
  startSec: z.number().int().nullable(),
  endSec: z.number().int().nullable(),
  createdAt: z.string().datetime()
});

export const jobStatusResponseSchema = z.object({
  token: z.string().min(1),
  status: z.string().min(1),
  inputKey: z.string().nullable(),
  error: z.string().nullable(),
  artifacts: z.array(artifactSchema)
});

export type UploadRequest = z.infer<typeof uploadRequestSchema>;
export type CreateJobResponse = z.infer<typeof createJobResponseSchema>;
export type JobStatusResponse = z.infer<typeof jobStatusResponseSchema>;
