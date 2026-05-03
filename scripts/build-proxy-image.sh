#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

IMAGE_TAG="${1:-souz-proxy:latest}"
TARGET_PLATFORM="${TARGET_PLATFORM:-linux/amd64}"

docker build \
  --platform "$TARGET_PLATFORM" \
  -t "$IMAGE_TAG" \
  "$REPO_ROOT"
