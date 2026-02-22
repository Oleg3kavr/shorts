#!/usr/bin/env bash
set -euo pipefail

echo "Starting local infra services..."
docker compose -f infra/docker-compose.yml up -d
