#!/usr/bin/env bash
set -euo pipefail

if [ -z "${COMPOSE_FILE:-}" ]; then
  if [ -f "./docker-compose.prod.yml" ]; then
    COMPOSE_FILE="./docker-compose.prod.yml"
  else
    COMPOSE_FILE="deploy/docker-compose.prod.yml"
  fi
fi
ENV_FILE="${ENV_FILE:-.env}"
DOMAIN="${DOMAIN:?DOMAIN is required}"

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps

echo "Check backend health from proxy container..."
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec web-proxy \
  sh -lc 'wget -qO- http://souz-backend:8080/health || curl -fsS http://souz-backend:8080/health'

echo "Check public HTTPS..."
curl -fsS "https://${DOMAIN}/healthz" || true

echo "Check that backend is not published on host..."
if curl -fsS "http://127.0.0.1:8081/health"; then
  echo "Unexpected backend exposure?"
  exit 1
else
  echo "Backend is not exposed on 8081, OK"
fi
