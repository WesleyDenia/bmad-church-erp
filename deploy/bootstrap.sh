#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
project_root="$(cd -- "${script_dir}/.." && pwd)"
mode="${1:-server}"
env_file="${DEPLOY_ENV_FILE:-${script_dir}/.env}"

usage() {
  echo "Usage: bash deploy/bootstrap.sh [local|server]" >&2
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Required command is missing: $1" >&2
    exit 1
  }
}

read_env_value() {
  local name="$1"
  local source_file="$2"

  sed -n "s/^${name}=//p" "${source_file}" | tail -n 1
}

write_secret_if_missing() {
  local file="$1"
  shift

  if [ -e "${file}" ]; then
    return
  fi

  "$@" >"${file}"
  chmod 600 "${file}"
  echo "Created $(basename "${file}")."
}

generate_laravel_key() {
  printf 'base64:'
  openssl rand -base64 32 | tr -d '\n'
  printf '\n'
}

generate_password() {
  openssl rand -base64 36 | tr -d '\n'
  printf '\n'
}

generate_key_pair_if_missing() {
  local name="$1"
  local private_file="${secrets_dir}/${name}-private-key"
  local public_file="${secrets_dir}/${name}-public-key"

  if [ ! -e "${private_file}" ]; then
    openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:4096 >"${private_file}"
    chmod 600 "${private_file}"
    echo "Created $(basename "${private_file}")."
  fi

  if [ ! -e "${public_file}" ]; then
    openssl pkey -in "${private_file}" -pubout >"${public_file}"
    chmod 600 "${public_file}"
    echo "Created $(basename "${public_file}")."
  fi
}

case "${mode}" in
  local|server)
    ;;
  *)
    usage
    exit 2
    ;;
esac

require_command docker
require_command openssl

if [ "${mode}" = "server" ] && [ ! -f "${env_file}" ]; then
  cp "${script_dir}/.env.example" "${env_file}"
  chmod 600 "${env_file}"
  echo "Created ${env_file}. Fill in the domains, email and external secret/backup paths, then run this command again." >&2
  exit 1
fi

if [ -n "${DEPLOY_SECRETS_DIR:-}" ]; then
  secrets_dir="${DEPLOY_SECRETS_DIR}"
elif [ "${mode}" = "server" ]; then
  secrets_dir="$(read_env_value DEPLOY_SECRETS_DIR "${env_file}")"
else
  secrets_dir="${project_root}/.deploy-secrets"
fi

if [ -z "${secrets_dir}" ] || [[ "${secrets_dir}" == *"/absolute/path/"* ]]; then
  echo "Set DEPLOY_SECRETS_DIR to a real directory outside the repository before continuing." >&2
  exit 1
fi

umask 077
mkdir -p "${secrets_dir}"
chmod 700 "${secrets_dir}"

write_secret_if_missing "${secrets_dir}/mysql-root-password" generate_password
write_secret_if_missing "${secrets_dir}/dev-db-password" generate_password
write_secret_if_missing "${secrets_dir}/stg-db-password" generate_password
write_secret_if_missing "${secrets_dir}/prod-db-password" generate_password
write_secret_if_missing "${secrets_dir}/api-local-app-key" generate_laravel_key
write_secret_if_missing "${secrets_dir}/api-dev-app-key" generate_laravel_key
write_secret_if_missing "${secrets_dir}/api-stg-app-key" generate_laravel_key
write_secret_if_missing "${secrets_dir}/api-prod-app-key" generate_laravel_key
generate_key_pair_if_missing jwt-local
generate_key_pair_if_missing jwt-dev
generate_key_pair_if_missing jwt-stg
generate_key_pair_if_missing jwt-prod

export DEPLOY_SECRETS_DIR="${secrets_dir}"

if [ "${mode}" = "local" ]; then
  docker compose -f "${script_dir}/docker-compose.local.yml" config --quiet
  docker compose -f "${script_dir}/docker-compose.local.yml" up -d --build --wait mysql-core
  docker compose -f "${script_dir}/docker-compose.local.yml" run --rm --no-deps api-dev php artisan migrate --force
  docker compose -f "${script_dir}/docker-compose.local.yml" up -d --build --wait
  echo "Local environment is ready at http://localhost:8080."
  exit 0
fi

export DEPLOY_ENV_FILE="${env_file}"
docker compose --env-file "${env_file}" -f "${script_dir}/docker-compose.infra.yml" config --quiet
docker compose --env-file "${env_file}" -f "${script_dir}/docker-compose.infra.yml" up -d --wait
echo "Shared server infrastructure is ready. Deploy an application with: bash deploy/release.sh dev|stg|prod"
