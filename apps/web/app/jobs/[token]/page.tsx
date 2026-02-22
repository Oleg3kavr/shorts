'use client';

import { useEffect, useState } from 'react';

type Artifact = {
  id: string;
  type: string;
  key: string;
  downloadUrl: string;
  title: string | null;
  startSec: number | null;
  endSec: number | null;
  createdAt: string;
};

type JobStatusResponse = {
  token: string;
  status: string;
  inputKey: string | null;
  error: string | null;
  artifacts: Artifact[];
};

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';

export default function JobDetailsPage({ params }: { params: { token: string } }) {
  const [job, setJob] = useState<JobStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadStatus() {
      try {
        const response = await fetch(`${apiBaseUrl}/v1/jobs/${params.token}`, { cache: 'no-store' });
        if (!response.ok) {
          throw new Error('Failed to load job status');
        }

        const payload = (await response.json()) as JobStatusResponse;
        if (isMounted) {
          setJob(payload);
          setError(null);
        }
      } catch (statusError) {
        if (isMounted) {
          setError(statusError instanceof Error ? statusError.message : 'Polling failed');
        }
      }
    }

    loadStatus();
    const interval = setInterval(loadStatus, 3000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [params.token]);

  return (
    <main>
      <h1>Job {params.token}</h1>
      {error ? <p>{error}</p> : null}
      {!job ? <p>Loading…</p> : null}
      {job ? (
        <>
          <p>Status: {job.status}</p>
          <p>Input key: {job.inputKey ?? 'Not attached yet'}</p>
          <h2>Artifacts</h2>
          {job.artifacts.length === 0 ? <p>No artifacts yet.</p> : null}
          <ul>
            {job.artifacts.map((artifact) => (
              <li key={artifact.id}>
                {artifact.type}:{' '}
                <a href={artifact.downloadUrl} target="_blank" rel="noreferrer">
                  {artifact.title ?? artifact.key}
                </a>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </main>
  );
}
