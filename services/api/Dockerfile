FROM node:20-bullseye-slim

WORKDIR /repo

RUN corepack enable

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/package.json
COPY services/api/package.json services/api/package.json
COPY services/worker/package.json services/worker/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/db/package.json packages/db/package.json

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm --filter @shorts/db db:generate

EXPOSE 8000

CMD ["pnpm", "--filter", "@shorts/api", "dev"]
