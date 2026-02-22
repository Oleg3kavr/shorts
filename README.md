# Shorts Monorepo

[![CI](https://img.shields.io/badge/ci-pending-lightgrey)](https://github.com/your-org/shorts/actions)
[![Coverage](https://img.shields.io/badge/coverage-pending-lightgrey)](#)

Monorepo scaffold for a SaaS that turns uploaded videos into short clips.

## Workspace layout

- `apps/web` - Next.js App Router frontend.
- `services/api` - Fastify API service.
- `services/worker` - Node worker service scaffold.
- `packages/shared` - Shared schemas/types.
- `infra` - Docker Compose and helper scripts.

## Local development

1. Install dependencies:
   ```bash
   pnpm install
   ```
2. (Optional) Start local infra:
   ```bash
   ./infra/scripts/dev.sh
   ```
3. Run checks:
   ```bash
   pnpm -r lint
   pnpm -r typecheck
   pnpm -r test
   ```
4. Run apps/services:
   ```bash
   pnpm --filter @shorts/web dev
   pnpm --filter @shorts/api dev
   pnpm --filter @shorts/worker dev
   ```
