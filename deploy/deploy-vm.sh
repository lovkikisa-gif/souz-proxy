#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd -- "$(dirname "${BASH_SOURCE[0]}")" && pwd)
ROOT_DIR=$(cd -- "$SCRIPT_DIR/.." && pwd)
CONFIG_FILE=${1:-"$SCRIPT_DIR/deploy.env"}
COMMON_FILE="$SCRIPT_DIR/common.sh"

# shellcheck source=./common.sh
source "$COMMON_FILE"

require_command ssh
require_command scp
require_command mktemp
require_file "$CONFIG_FILE"
require_file "$SCRIPT_DIR/build-images.sh"
require_file "$SCRIPT_DIR/export-images.sh"
require_file "$SCRIPT_DIR/remote-bootstrap-vm.sh"

load_env_file "$CONFIG_FILE"

require_env DEPLOY_HOST
require_env DEPLOY_USER
require_env DOMAIN
require_env PUBLIC_BASE_URL
require_env SOUZ_BACKEND_PROXY_TOKEN
require_env SOUZ_MASTER_KEY
require_env TELEGRAM_TOKEN_ENCRYPTION_KEY
require_env PROXY_DB_PASSWORD
require_env BACKEND_DB_PASSWORD
require_env SESSION_HASH_SECRET
require_env WELCOME_KEY_SECRET

DEPLOY_SSH_PORT=${DEPLOY_SSH_PORT:-22}
REMOTE_APP_DIR=${REMOTE_APP_DIR:-/opt/souz}
REMOTE_RELEASES_TO_KEEP=${REMOTE_RELEASES_TO_KEEP:-3}
BUILD_IMAGES_LOCALLY=${BUILD_IMAGES_LOCALLY:-true}
EXPORT_BUNDLE_LOCALLY=${EXPORT_BUNDLE_LOCALLY:-true}
INSTALL_DOCKER=${INSTALL_DOCKER:-true}
ENABLE_CADDY=${ENABLE_CADDY:-true}
INSTALL_CADDY=${INSTALL_CADDY:-true}
COMPOSE_PROJECT_NAME=${COMPOSE_PROJECT_NAME:-souz}
HOST_PROXY_PORT=${HOST_PROXY_PORT:-8080}
SOUZ_VERSION=${SOUZ_VERSION:-latest}
REMOTE_TARGET="${DEPLOY_USER}@${DEPLOY_HOST}"
REMOTE_RELEASE_ID=$(date -u +"%Y%m%d%H%M%S")
REMOTE_RELEASE_DIR="${REMOTE_APP_DIR}/releases/${REMOTE_RELEASE_ID}"

if [[ -z "${BACKEND_DIR:-}" ]]; then
    if [[ -d "$ROOT_DIR/../abledo" ]]; then
        BACKEND_DIR="$ROOT_DIR/../abledo"
    else
        BACKEND_DIR="$ROOT_DIR/../souz"
    fi
fi

if [[ -z "${OUT_DIR:-}" ]]; then
    OUT_DIR="$ROOT_DIR/dist/$SOUZ_VERSION"
fi

APP_ENV_FILE=$(mktemp)
SSH_CONTROL_DIR=$(mktemp -d)
SSH_CONTROL_PATH="$SSH_CONTROL_DIR/ctl"
SSH_MASTER_ARGS=(
    -p "$DEPLOY_SSH_PORT"
    -o ControlMaster=yes
    -o ControlPersist=10m
    -o ControlPath="$SSH_CONTROL_PATH"
)
SSH_ARGS=(
    -p "$DEPLOY_SSH_PORT"
    -o ControlMaster=auto
    -o ControlPersist=10m
    -o ControlPath="$SSH_CONTROL_PATH"
)
SCP_ARGS=(
    -P "$DEPLOY_SSH_PORT"
    -o ControlMaster=auto
    -o ControlPersist=10m
    -o ControlPath="$SSH_CONTROL_PATH"
)
SSH_CONTROL_READY=false

cleanup() {
    local status=$?
    trap - EXIT

    if [[ "${SSH_CONTROL_READY:-false}" == "true" ]]; then
        ssh -S "$SSH_CONTROL_PATH" -O exit -p "$DEPLOY_SSH_PORT" "$REMOTE_TARGET" >/dev/null 2>&1 || true
    fi

    rm -rf "$SSH_CONTROL_DIR"
    rm -f "$APP_ENV_FILE"
    exit "$status"
}

trap cleanup EXIT

append_env_line() {
    local key=$1
    local value=${!key:-}
    printf '%s=%s\n' "$key" "$value" >> "$APP_ENV_FILE"
}

append_env_if_set() {
    local key=$1
    if [[ -n "${!key:-}" ]]; then
        append_env_line "$key"
    fi
}

render_app_env() {
    : > "$APP_ENV_FILE"

    append_env_line COMPOSE_PROJECT_NAME
    append_env_line DOMAIN
    append_env_line PUBLIC_BASE_URL
    append_env_line HOST_PROXY_PORT
    append_env_line SOUZ_VERSION
    append_env_line SOUZ_BACKEND_PROXY_TOKEN
    append_env_line SOUZ_MASTER_KEY
    append_env_line TELEGRAM_TOKEN_ENCRYPTION_KEY
    append_env_line PROXY_DB_PASSWORD
    append_env_line BACKEND_DB_PASSWORD
    append_env_line SESSION_HASH_SECRET
    append_env_line WELCOME_KEY_SECRET

    append_env_if_set PROXY_HOST
    append_env_if_set PROXY_PORT
    append_env_if_set BACKEND_URL
    append_env_if_set COOKIE_NAME
    append_env_if_set COOKIE_SECURE
    append_env_if_set SESSION_TTL_DAYS
    append_env_if_set PROXY_ENV
    append_env_if_set WS_ALLOWED_ORIGINS
    append_env_if_set WS_MAX_FRAME_SIZE_BYTES
    append_env_if_set WS_PING_PERIOD_SECONDS
    append_env_if_set WS_IDLE_TIMEOUT_SECONDS
    append_env_if_set AUTH_RATE_LIMIT_MAX_ATTEMPTS
    append_env_if_set AUTH_RATE_LIMIT_WINDOW_SECONDS
    append_env_if_set BACKEND_REQUEST_TIMEOUT_SECONDS

    append_env_if_set SOUZ_BACKEND_HOST
    append_env_if_set SOUZ_BACKEND_PORT
    append_env_if_set SOUZ_STORAGE_MODE
    append_env_if_set SOUZ_BACKEND_DB_HOST
    append_env_if_set SOUZ_BACKEND_DB_PORT
    append_env_if_set SOUZ_BACKEND_DB_NAME
    append_env_if_set SOUZ_BACKEND_DB_USER
    append_env_if_set SOUZ_BACKEND_DB_SCHEMA
    append_env_if_set SOUZ_BACKEND_DB_MAX_POOL_SIZE
    append_env_if_set SOUZ_BACKEND_DB_CONNECTION_TIMEOUT_MS
    append_env_if_set SOUZ_BACKEND_DATA_DIR

    append_env_if_set ENABLE_BACKEND_TG_FEATURE
    append_env_if_set SOUZ_FEATURE_WS_EVENTS
    append_env_if_set SOUZ_FEATURE_STREAMING_MESSAGES
    append_env_if_set SOUZ_FEATURE_TOOL_EVENTS
    append_env_if_set SOUZ_FEATURE_OPTIONS
    append_env_if_set SOUZ_FEATURE_DURABLE_EVENT_REPLAY

    append_env_if_set SOUZ_BACKEND_LIMIT_PER_USER_CONCURRENT_EXECUTIONS
    append_env_if_set SOUZ_BACKEND_LIMIT_PER_USER_REQUESTS_PER_MINUTE
    append_env_if_set SOUZ_BACKEND_LIMIT_PER_USER_TOKENS_PER_MINUTE
    append_env_if_set SOUZ_BACKEND_LIMIT_GLOBAL_PROVIDER_CONCURRENCY
    append_env_if_set SOUZ_BACKEND_PROVIDER_MAX_429_RETRIES
    append_env_if_set SOUZ_BACKEND_PROVIDER_BACKOFF_BASE_MS
    append_env_if_set SOUZ_BACKEND_PROVIDER_BACKOFF_MAX_MS
    append_env_if_set SOUZ_BACKEND_SYSTEM_PROMPT

    append_env_if_set OPENAI_API_KEY
    append_env_if_set OPENAI_MODEL
    append_env_if_set OPENAI_EMBEDDINGS_MODEL
    append_env_if_set ANTHROPIC_API_KEY
    append_env_if_set ANTHROPIC_MODEL
    append_env_if_set QWEN_KEY
    append_env_if_set QWEN_MODEL
    append_env_if_set QWEN_EMBEDDINGS_MODEL
    append_env_if_set AITUNNEL_KEY
    append_env_if_set AITUNNEL_MODEL
    append_env_if_set AITUNNEL_EMBEDDINGS_MODEL
    append_env_if_set GIGA_KEY
    append_env_if_set GIGA_LOG_LEVEL
}

start_ssh_control_connection() {
    printf 'Opening shared SSH control connection to %s. Enter the SSH password once if prompted.\n' "$REMOTE_TARGET"
    ssh -Nf "${SSH_MASTER_ARGS[@]}" "$REMOTE_TARGET"
    SSH_CONTROL_READY=true
    printf 'SSH control connection established.\n'
}

printf 'Deploy target: %s\n' "$REMOTE_TARGET"
printf 'Remote release: %s\n' "$REMOTE_RELEASE_DIR"
printf 'Bundle output: %s\n' "$OUT_DIR"
start_ssh_control_connection

if [[ "$BUILD_IMAGES_LOCALLY" == "true" ]]; then
    printf 'Building Docker images locally...\n'
    BACKEND_DIR="$BACKEND_DIR" "$SCRIPT_DIR/build-images.sh" "$SOUZ_VERSION"
fi

if [[ "$EXPORT_BUNDLE_LOCALLY" == "true" ]]; then
    printf 'Exporting Docker image bundle locally...\n'
    OUT_DIR="$OUT_DIR" "$SCRIPT_DIR/export-images.sh" "$SOUZ_VERSION"
fi

render_app_env

ssh "${SSH_ARGS[@]}" "$REMOTE_TARGET" "mkdir -p '$REMOTE_RELEASE_DIR/deploy'"
scp "${SCP_ARGS[@]}" "$OUT_DIR"/* "$REMOTE_TARGET:$REMOTE_RELEASE_DIR/"
scp "${SCP_ARGS[@]}" "$COMMON_FILE" "$SCRIPT_DIR/remote-bootstrap-vm.sh" "$REMOTE_TARGET:$REMOTE_RELEASE_DIR/deploy/"
scp "${SCP_ARGS[@]}" "$APP_ENV_FILE" "$REMOTE_TARGET:$REMOTE_RELEASE_DIR/.env"

ssh "${SSH_ARGS[@]}" "$REMOTE_TARGET" \
    "chmod +x '$REMOTE_RELEASE_DIR/load-and-run.sh' '$REMOTE_RELEASE_DIR/smoke-test.sh' '$REMOTE_RELEASE_DIR/insert-welcome-key.sh' '$REMOTE_RELEASE_DIR/deploy/remote-bootstrap-vm.sh' && \
     DEPLOY_RELEASE_DIR='$REMOTE_RELEASE_DIR' \
     REMOTE_APP_DIR='$REMOTE_APP_DIR' \
     REMOTE_RELEASES_TO_KEEP='$REMOTE_RELEASES_TO_KEEP' \
     INSTALL_DOCKER='$INSTALL_DOCKER' \
     ENABLE_CADDY='$ENABLE_CADDY' \
     INSTALL_CADDY='$INSTALL_CADDY' \
     CADDY_ADMIN_EMAIL='${CADDY_ADMIN_EMAIL:-}' \
     '$REMOTE_RELEASE_DIR/deploy/remote-bootstrap-vm.sh'"

printf 'Deploy finished.\n'
