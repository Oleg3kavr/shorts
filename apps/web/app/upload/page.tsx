'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type PresignResponse = {
  key: string;
  uploadUrl: string;
};

type CreateJobResponse = {
  token: string;
  status: string;
};

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload() {
    if (!file || isUploading) {
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const presignResponse = await fetch(`${apiBaseUrl}/v1/uploads/presign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          sizeBytes: file.size
        })
      });

      if (!presignResponse.ok) {
        throw new Error('Failed to create upload URL');
      }

      const { key, uploadUrl } = (await presignResponse.json()) as PresignResponse;

      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file to storage');
      }

      const createJobResponse = await fetch(`${apiBaseUrl}/v1/jobs`, {
        method: 'POST'
      });

      if (!createJobResponse.ok) {
        throw new Error('Failed to create job');
      }

      const createdJob = (await createJobResponse.json()) as CreateJobResponse;

      const attachResponse = await fetch(`${apiBaseUrl}/v1/jobs/${createdJob.token}/attach-input`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputKey: key })
      });

      if (!attachResponse.ok) {
        throw new Error('Failed to attach uploaded input to the job');
      }

      router.push(`/jobs/${createdJob.token}`);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <main>
      <h1>Upload</h1>
      <p>Select a video file and upload directly to object storage.</p>
      <input
        type="file"
        accept="video/mp4,video/quicktime,video/x-matroska,video/webm"
        onChange={(event) => setFile(event.target.files?.[0] ?? null)}
      />
      <button type="button" disabled={!file || isUploading} onClick={handleUpload}>
        {isUploading ? 'Uploading…' : 'Upload & create job'}
      </button>
      {error ? <p>{error}</p> : null}
    </main>
  );
}
