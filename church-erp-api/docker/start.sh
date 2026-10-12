#!/bin/sh
set -eu

load_secret() {
  variable_name="$1"
  file_variable_name="${variable_name}_FILE"
  eval "secret_file=\${${file_variable_name}:-}"

  if [ -n "${secret_file}" ]; then
    if [ ! -r "${secret_file}" ]; then
      echo "Secret file for ${variable_name} is not readable." >&2
      exit 1
    fi

    export "${variable_name}=$(cat "${secret_file}")"
  fi
}

load_secret APP_KEY
load_secret DB_PASSWORD
load_secret INTERNAL_JWT_PUBLIC_KEY

if [ -z "${APP_KEY:-}" ]; then
  echo "APP_KEY must be provided through APP_KEY or APP_KEY_FILE." >&2
  exit 1
fi

if [ -z "${INTERNAL_JWT_PUBLIC_KEY:-}" ]; then
  echo "INTERNAL_JWT_PUBLIC_KEY must be provided through INTERNAL_JWT_PUBLIC_KEY or INTERNAL_JWT_PUBLIC_KEY_FILE." >&2
  exit 1
fi

exec "$@"
