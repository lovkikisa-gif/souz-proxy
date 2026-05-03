#!/usr/bin/env bash

require_command() {
    if ! command -v "$1" >/dev/null 2>&1; then
        printf 'Required command is missing: %s\n' "$1" >&2
        exit 1
    fi
}

require_env() {
    local key=$1
    local value=${!key:-}
    if [[ -z "$value" ]]; then
        printf 'Required variable is missing: %s\n' "$key" >&2
        exit 1
    fi
}

require_file() {
    if [[ ! -f "$1" ]]; then
        printf 'Required file is missing: %s\n' "$1" >&2
        exit 1
    fi
}

trim_ascii_whitespace() {
    local value=$1
    value="${value#"${value%%[![:space:]]*}"}"
    value="${value%"${value##*[![:space:]]}"}"
    printf '%s' "$value"
}

load_env_file() {
    local file=$1
    local line
    local key
    local value

    require_file "$file"

    while IFS= read -r line || [[ -n "$line" ]]; do
        line=${line%$'\r'}

        [[ $line =~ ^[[:space:]]*$ ]] && continue
        [[ $line =~ ^[[:space:]]*# ]] && continue

        if [[ $line =~ ^[[:space:]]*(export[[:space:]]+)?([A-Za-z_][A-Za-z0-9_]*)[[:space:]]*=(.*)$ ]]; then
            key=${BASH_REMATCH[2]}
            value=$(trim_ascii_whitespace "${BASH_REMATCH[3]}")

            if [[ ${#value} -ge 2 ]]; then
                if [[ ${value:0:1} == '"' && ${value: -1} == '"' ]]; then
                    value=${value:1:-1}
                elif [[ ${value:0:1} == "'" && ${value: -1} == "'" ]]; then
                    value=${value:1:-1}
                fi
            fi

            printf -v "$key" '%s' "$value"
            export "$key"
            continue
        fi

        printf 'Invalid config line in %s: %s\n' "$file" "$line" >&2
        exit 1
    done < "$file"
}
