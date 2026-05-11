#!/usr/bin/env bash
set -euo pipefail

RAW_KEY="${1:-}"
SECRET="${2:-${WELCOME_KEY_SECRET:-}}"

if [ -z "$RAW_KEY" ]; then
  echo "Usage: ./hash-welcome-key.sh <raw-key> [secret]" >&2
  echo "If secret is not provided, it reads from WELCOME_KEY_SECRET env variable." >&2
  exit 1
fi

if [ -z "$SECRET" ]; then
  echo "Error: WELCOME_KEY_SECRET environment variable is not set." >&2
  exit 1
fi

HASH="$(
  printf '%s' "$RAW_KEY" \
    | openssl dgst -sha256 -hmac "$SECRET" -binary \
    | openssl base64 -A \
    | tr '+/' '-_' \
    | tr -d '='
)"

printf 'Raw Key: %s\n' "$RAW_KEY"
printf 'Hash:    %s\n' "$HASH"
