import { z } from 'zod';

export const uploadRequestSchema = z.object({
  filename: z.string().min(1),
  mimeType: z.string().min(1)
});

export type UploadRequest = z.infer<typeof uploadRequestSchema>;
