#!/usr/bin/env bash
set -euo pipefail

if [ ! -f .env ]; then
  echo "Create .env from .env.example first"
  exit 1
fi

cleanup_legacy_project() {
  local project="$1"
  mapfile -t ids < <(docker ps -aq --filter "label=com.docker.compose.project=${project}")
  if [ "${#ids[@]}" -gt 0 ]; then
    docker rm -f "${ids[@]}"
  fi
}

docker compose --env-file .env -f docker-compose.prod.yml down --remove-orphans || true
cleanup_legacy_project souz-backend

gunzip -c souz-backend-*.tar.gz | docker load
gunzip -c souz-proxy-*.tar.gz | docker load

docker compose --env-file .env -f docker-compose.prod.yml up -d --remove-orphans
docker compose --env-file .env -f docker-compose.prod.yml ps
