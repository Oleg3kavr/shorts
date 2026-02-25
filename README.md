# Shorts Monorepo

[![CI](https://img.shields.io/badge/ci-pending-lightgrey)](https://github.com/your-org/shorts/actions)
[![Coverage](https://img.shields.io/badge/coverage-pending-lightgrey)](#)

Monorepo scaffold for a SaaS that turns uploaded videos into short clips.

## Workspace layout

- `apps/web` - Next.js App Router frontend.
- `services/api` - Fastify API service.
- `services/worker` - Node worker service scaffold.
- `packages/shared` - Shared schemas/types.
- `packages/db` - Prisma schema and shared Prisma client.
- `infra` - Docker Compose and helper scripts.

## Local development

1. Install dependencies:
   ```bash
   pnpm install
   ```
2. Generate Prisma client (also runs via root `postinstall`):
   ```bash
   pnpm --filter @shorts/db db:generate
   ```
3. Push the database schema for local MVP development:
   ```bash
   pnpm --filter @shorts/db db:push
   ```
4. (Optional) Start local infra:
   ```bash
   ./infra/scripts/dev.sh
   ```
5. Run checks:
   ```bash
   pnpm -r lint
   pnpm -r typecheck
   pnpm -r test
   ```
6. Run apps/services:
   ```bash
   pnpm --filter @shorts/web dev
   pnpm --filter @shorts/api dev
   pnpm --filter @shorts/worker dev
   ```


## Object storage configuration

The API now signs direct-to-storage upload/download URLs using the AWS SDK v3 S3 client (compatible with Amazon S3 and Cloudflare R2).

Required API environment variables:

- `S3_ENDPOINT`
- `S3_BUCKET`
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`
- `S3_REGION` (optional, defaults to `auto`)

Browser uploads should call `POST /v1/uploads/presign`, upload bytes directly to the returned URL, then attach the key with `POST /v1/jobs/:token/attach-input`.

## Docker Compose full stack

Start the full stack (Postgres, Redis, API, worker, web):

```bash
docker compose -f infra/docker-compose.yml up --build
```

Start the full stack with local S3-compatible storage via MinIO:

```bash
docker compose -f infra/docker-compose.yml -f infra/docker-compose.local.yml up --build
```

Open the MinIO console at http://localhost:9001 (login: `minioadmin` / `minioadmin`).

Check API health:

```bash
curl http://localhost:8000/healthz
```

## CI security and dependency gates

GitHub Actions now enforces repository-level security and quality checks on pull requests and `main`:

- `CI` runs lint, typecheck, tests, and a gitleaks secret scan (fails if secrets are detected).
- `CodeQL` analyzes JavaScript/TypeScript code on PRs, pushes to `main`, and weekly on a schedule.
- Dependabot opens weekly update PRs for npm dependencies and GitHub Actions.
- The lockfile PR workflow requires an Actions secret named `CREATE_PR_TOKEN` (fine-grained PAT with `Contents: Read and write` + `Pull requests: Read and write`) so downstream workflows still run on the generated `chore/pnpm-lockfile` PR.

## E2E smoke test

Run the end-to-end smoke test stack (Postgres, Redis, MinIO, API, worker, tester):

```bash
docker compose -f infra/docker-compose.e2e.yml up --build -d
docker compose -f infra/docker-compose.e2e.yml run --rm tester
docker compose -f infra/docker-compose.e2e.yml down -v
```

The smoke script (`infra/scripts/e2e-smoke.js`) validates this flow:

`create job -> presign upload -> upload -> attach input -> queue -> worker done`.

## Browser E2E test (Playwright)

Run the browser-level upload flow test in Docker (Postgres, Redis, MinIO, API, worker, web + Playwright runner):

```bash
docker compose -p web_e2e -f infra/docker-compose.e2e.yml up --build -d postgres redis minio minio-init api worker web
docker run --rm --network web_e2e_default -v "$PWD:/work" -w /work mcr.microsoft.com/playwright:v1.50.1-jammy bash -lc "corepack enable && pnpm install --no-frozen-lockfile && pnpm test:e2e:web"
docker compose -p web_e2e -f infra/docker-compose.e2e.yml down -v
```

The Playwright spec (`e2e/web.spec.ts`) validates:

- Browser upload from `http://web:3000/upload` using a generated `video/mp4` fixture.
- Redirect to `/jobs/[token]`.
- Job reaches `done` within 120s.
- Artifacts link is shown when available, otherwise `inputKey` is persisted and status is still `done`.

## Jobs v0 curl flow

Create a job:

```bash
curl -s -X POST http://localhost:8000/v1/jobs
```

Queue the job (replace `$TOKEN` from create response):

```bash
curl -s -X POST http://localhost:8000/v1/jobs/$TOKEN/queue
```

Poll status until done:

```bash
while true; do
  curl -s http://localhost:8000/v1/jobs/$TOKEN
  echo
  sleep 1
done
```

Expected lifecycle: `created -> queued -> processing -> done`.

Open the web app:

- http://localhost:3000
t
