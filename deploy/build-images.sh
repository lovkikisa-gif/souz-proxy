#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

if [ -z "${BACKEND_DIR:-}" ]; then
  if [ -d "$REPO_ROOT/../abledo" ]; then
    BACKEND_DIR="$REPO_ROOT/../abledo"
  else
    BACKEND_DIR="$REPO_ROOT/../souz"
  fi
fi

if [ -z "${PROXY_DIR:-}" ]; then
  PROXY_DIR="$REPO_ROOT"
fi

VERSION="${1:-latest}"
TARGET_PLATFORM="${TARGET_PLATFORM:-linux/amd64}"

echo "Building backend image for $TARGET_PLATFORM..."
docker build \
  --platform "$TARGET_PLATFORM" \
  -f "$BACKEND_DIR/backend.Dockerfile" \
  -t "souz-backend:$VERSION" \
  "$BACKEND_DIR"

echo "Building proxy image for $TARGET_PLATFORM..."
docker build \
  --platform "$TARGET_PLATFORM" \
  -t "souz-proxy:$VERSION" \
  "$PROXY_DIR"
