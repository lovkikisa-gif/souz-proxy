#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

VERSION="${1:-latest}"
OUT_DIR="${OUT_DIR:-$REPO_ROOT/dist}"

mkdir -p "$OUT_DIR"

docker save "souz-backend:$VERSION" | gzip > "$OUT_DIR/souz-backend-$VERSION.tar.gz"
docker save "souz-proxy:$VERSION" | gzip > "$OUT_DIR/souz-proxy-$VERSION.tar.gz"

cp "$REPO_ROOT/deploy/docker-compose.prod.yml" "$OUT_DIR/docker-compose.prod.yml"
cp "$REPO_ROOT/deploy/.env.example" "$OUT_DIR/.env.example"
cp "$REPO_ROOT/deploy/.env.example" "$OUT_DIR/env.example"
cp "$REPO_ROOT/deploy/README.md" "$OUT_DIR/README.deploy.md"
cp "$REPO_ROOT/deploy/create-welcome-key.md" "$OUT_DIR/create-welcome-key.md"
cp "$REPO_ROOT/deploy/smoke-test.sh" "$OUT_DIR/smoke-test.sh"
cp "$REPO_ROOT/deploy/insert-welcome-key.sh" "$OUT_DIR/insert-welcome-key.sh"

cat > "$OUT_DIR/load-and-run.sh" <<'EOF'
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
EOF

chmod +x "$OUT_DIR/load-and-run.sh"
chmod +x "$OUT_DIR/smoke-test.sh" "$OUT_DIR/insert-welcome-key.sh"

echo "Exported to $OUT_DIR"
