import Link from 'next/link';

export default function HomePage() {
  return (
    <main>
      <h1>Shorts SaaS</h1>
      <p>Upload long-form videos and generate short clips.</p>
      <Link href="/upload">Go to upload</Link>
    </main>
  );
}
