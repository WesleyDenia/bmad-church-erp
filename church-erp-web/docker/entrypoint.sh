#!/bin/sh
set -eu

if [ -n "${INTERNAL_JWT_PRIVATE_KEY_FILE:-}" ]; then
  if [ ! -r "${INTERNAL_JWT_PRIVATE_KEY_FILE}" ]; then
    echo "INTERNAL_JWT_PRIVATE_KEY_FILE is not readable." >&2
    exit 1
  fi

  export INTERNAL_JWT_PRIVATE_KEY="$(cat "${INTERNAL_JWT_PRIVATE_KEY_FILE}")"
fi

if [ -z "${INTERNAL_JWT_PRIVATE_KEY:-}" ]; then
  echo "INTERNAL_JWT_PRIVATE_KEY must be provided through INTERNAL_JWT_PRIVATE_KEY or INTERNAL_JWT_PRIVATE_KEY_FILE." >&2
  exit 1
fi

exec node server.js
