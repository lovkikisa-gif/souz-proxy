#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd -- "$(dirname "${BASH_SOURCE[0]}")" && pwd)
RELEASE_DIR=${DEPLOY_RELEASE_DIR:-$(cd -- "$SCRIPT_DIR/.." && pwd)}
COMMON_FILE="$SCRIPT_DIR/common.sh"
ENV_FILE="$RELEASE_DIR/.env"
CURRENT_LINK="${REMOTE_APP_DIR:?REMOTE_APP_DIR is required}/current"
REMOTE_RELEASES_TO_KEEP=${REMOTE_RELEASES_TO_KEEP:-3}
INSTALL_DOCKER=${INSTALL_DOCKER:-true}
ENABLE_CADDY=${ENABLE_CADDY:-true}
INSTALL_CADDY=${INSTALL_CADDY:-true}
APT_UPDATED=false

# shellcheck source=./common.sh
source "$COMMON_FILE"

require_file "$ENV_FILE"
load_env_file "$ENV_FILE"

if command -v sudo >/dev/null 2>&1; then
    SUDO=(sudo)
elif [[ $(id -u) -eq 0 ]]; then
    SUDO=()
else
    printf 'Required command is missing: sudo\n' >&2
    exit 1
fi

apt_install() {
    if [[ "$APT_UPDATED" != "true" ]]; then
        "${SUDO[@]}" apt-get update
        APT_UPDATED=true
    fi

    "${SUDO[@]}" apt-get install -y "$@"
}

ensure_docker() {
    if ! command -v curl >/dev/null 2>&1; then
        apt_install curl ca-certificates
    fi

    if ! command -v docker >/dev/null 2>&1; then
        if [[ "$INSTALL_DOCKER" != "true" ]]; then
            printf 'Docker is not installed and INSTALL_DOCKER=false.\n' >&2
            exit 1
        fi
        curl -fsSL https://get.docker.com | "${SUDO[@]}" sh
    fi

    "${SUDO[@]}" systemctl enable --now docker
}

ensure_caddy() {
    if [[ "$ENABLE_CADDY" != "true" ]]; then
        return
    fi

    if ! command -v caddy >/dev/null 2>&1; then
        if [[ "$INSTALL_CADDY" != "true" ]]; then
            printf 'Caddy is not installed and INSTALL_CADDY=false.\n' >&2
            exit 1
        fi
        apt_install caddy
    fi

    local caddyfile=/etc/caddy/Caddyfile
    local temp_file
    temp_file=$(mktemp)

    if [[ -n "${CADDY_ADMIN_EMAIL:-}" ]]; then
        cat > "$temp_file" <<EOF
{
  email ${CADDY_ADMIN_EMAIL}
}

${DOMAIN} {
  reverse_proxy 127.0.0.1:${HOST_PROXY_PORT}
}
EOF
    else
        cat > "$temp_file" <<EOF
${DOMAIN} {
  reverse_proxy 127.0.0.1:${HOST_PROXY_PORT}
}
EOF
    fi

    "${SUDO[@]}" cp "$temp_file" "$caddyfile"
    rm -f "$temp_file"
    "${SUDO[@]}" systemctl enable --now caddy
    "${SUDO[@]}" caddy validate --config "$caddyfile"
    "${SUDO[@]}" systemctl reload caddy
}

cleanup_old_releases() {
    if [[ ! -d "${REMOTE_APP_DIR}/releases" ]]; then
        return
    fi

    mapfile -t releases < <(find "${REMOTE_APP_DIR}/releases" -mindepth 1 -maxdepth 1 -type d | sort)
    if (( ${#releases[@]} <= REMOTE_RELEASES_TO_KEEP )); then
        return
    fi

    local to_remove_count=$(( ${#releases[@]} - REMOTE_RELEASES_TO_KEEP ))
    local i
    for (( i=0; i<to_remove_count; i++ )); do
        if [[ ${releases[$i]} != "$RELEASE_DIR" ]]; then
            rm -rf "${releases[$i]}"
        fi
    done
}

ensure_docker
ensure_caddy

cd "$RELEASE_DIR"
"${SUDO[@]}" ./load-and-run.sh

curl -fsS "http://127.0.0.1:${HOST_PROXY_PORT}/healthz" >/dev/null
"${SUDO[@]}" docker compose --env-file .env -f docker-compose.prod.yml ps
ln -sfn "$RELEASE_DIR" "$CURRENT_LINK"

cleanup_old_releases
