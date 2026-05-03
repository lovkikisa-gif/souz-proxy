#!/usr/bin/env bash
set -euo pipefail

HASH="${1:?Usage: ./deploy/insert-welcome-key.sh <hash> <comment>}"
COMMENT="${2:?Usage: ./deploy/insert-welcome-key.sh <hash> <comment>}"
if [ -z "${COMPOSE_FILE:-}" ]; then
  if [ -f "./docker-compose.prod.yml" ]; then
    COMPOSE_FILE="./docker-compose.prod.yml"
  else
    COMPOSE_FILE="deploy/docker-compose.prod.yml"
  fi
fi
ENV_FILE="${ENV_FILE:-.env}"
EXPIRES_IN_DAYS="${EXPIRES_IN_DAYS:-30}"

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T proxy-db \
  psql -v ON_ERROR_STOP=1 -U souz_proxy -d souz_proxy \
  -v key_hash="$HASH" \
  -v comment="$COMMENT" \
  -v expires_in_days="$EXPIRES_IN_DAYS" <<'SQL'
insert into welcome_keys (key_hash, expires_at, comment)
values (:'key_hash', now() + (:'expires_in_days' || ' days')::interval, :'comment');
SQL
