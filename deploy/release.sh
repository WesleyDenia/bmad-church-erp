#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
project_root="$(cd -- "${script_dir}/.." && pwd)"
environment="${1:-}"
allow_dirty="${2:-}"
env_file="${DEPLOY_ENV_FILE:-${script_dir}/.env}"

usage() {
  echo "Usage: bash deploy/release.sh <dev|stg|prod> [--allow-dirty]" >&2
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Required command is missing: $1" >&2
    exit 1
  }
}

read_env_value() {
  local name="$1"
  sed -n "s/^${name}=//p" "${env_file}" | tail -n 1
}

require_secret() {
  local name="$1"
  if [ ! -s "${secrets_dir}/${name}" ]; then
    echo "Missing or empty secret file: ${secrets_dir}/${name}" >&2
    exit 1
  fi
}

case "${environment}" in
  dev|stg|prod)
    ;;
  *)
    usage
    exit 2
    ;;
esac

if [ -n "${allow_dirty}" ] && [ "${allow_dirty}" != "--allow-dirty" ]; then
  usage
  exit 2
fi

require_command docker
require_command git

if [ ! -f "${env_file}" ]; then
  echo "Deployment configuration is missing: ${env_file}. Run bootstrap.sh server first." >&2
  exit 1
fi

secrets_dir="${DEPLOY_SECRETS_DIR:-$(read_env_value DEPLOY_SECRETS_DIR)}"
backup_dir="${DEPLOY_BACKUP_DIR:-$(read_env_value DEPLOY_BACKUP_DIR)}"

if [ -z "${secrets_dir}" ] || [ -z "${backup_dir}" ] || [[ "${secrets_dir}" == *"/absolute/path/"* ]] || [[ "${backup_dir}" == *"/absolute/path/"* ]]; then
  echo "DEPLOY_SECRETS_DIR and DEPLOY_BACKUP_DIR must point to real directories outside the repository." >&2
  exit 1
fi

if [ "${allow_dirty}" != "--allow-dirty" ] && [ -n "$(git -C "${project_root}" status --porcelain)" ]; then
  echo "Refusing to release a dirty worktree. Commit the release or explicitly use --allow-dirty." >&2
  exit 1
fi

release_tag="${RELEASE_TAG:-$(git -C "${project_root}" rev-parse --short=12 HEAD)}"
if [[ ! "${release_tag}" =~ ^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$ ]]; then
  echo "RELEASE_TAG is not a valid Docker tag." >&2
  exit 1
fi

case "${environment}" in
  dev)
    api_service="api-dev"
    web_service="web-dev"
    database_name="church_erp_dev"
    image_variable="DEV_IMAGE_TAG"
    database_secret="dev-db-password"
    ;;
  stg)
    api_service="api-stg"
    web_service="web-stg"
    database_name="church_erp_stg"
    image_variable="STG_IMAGE_TAG"
    database_secret="stg-db-password"
    ;;
  prod)
    api_service="api-prod"
    web_service="web-prod"
    database_name="church_erp_prod"
    image_variable="PROD_IMAGE_TAG"
    database_secret="prod-db-password"
    ;;
esac

require_secret mysql-root-password
require_secret "${database_secret}"
require_secret "api-${environment}-app-key"
require_secret "jwt-${environment}-private-key"
require_secret "jwt-${environment}-public-key"

mkdir -p "${backup_dir}"
chmod 700 "${backup_dir}"

export DEPLOY_SECRETS_DIR="${secrets_dir}"
export "${image_variable}=${release_tag}"

infra_compose() {
  docker compose --env-file "${env_file}" -f "${script_dir}/docker-compose.infra.yml" "$@"
}

app_compose() {
  docker compose --env-file "${env_file}" -f "${script_dir}/docker-compose.server.yml" "$@"
}

infra_compose config --quiet
app_compose config --quiet

echo "Running required security gate for ${environment}."
bash "${script_dir}/security-gate.sh" "${environment}"

infra_compose up -d --wait mysql-core reverse-proxy

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
backup_file="${backup_dir}/${environment}-${timestamp}-${release_tag}.sql"
echo "Creating database backup: ${backup_file}"
infra_compose exec -T mysql-core sh -ceu '
  MYSQL_PWD="$(cat /run/secrets/mysql_root_password)"
  export MYSQL_PWD
  exec mysqldump --single-transaction --routines --events --set-gtid-purged=OFF -uroot "$1"
' sh "${database_name}" >"${backup_file}"
chmod 600 "${backup_file}"

echo "Building immutable local images for ${environment} at ${release_tag}."
app_compose build "${api_service}" "${web_service}"

echo "Applying database migrations once for ${environment}."
app_compose run --rm --no-deps "${api_service}" php artisan migrate --force

state_dir="${project_root}/.deploy-releases"
state_file="${state_dir}/${environment}.last-success"
previous_tag=""
if [ -f "${state_file}" ]; then
  previous_tag="$(sed -n 's/^tag=//p' "${state_file}" | tail -n 1)"
fi

echo "Starting ${environment} services and waiting for health checks."
if ! app_compose up -d --no-build --wait --wait-timeout 120 "${api_service}" "${web_service}"; then
  if [ -n "${previous_tag}" ]; then
    echo "New application containers were unhealthy. Rolling application images back to ${previous_tag}; database migrations are not reverted." >&2
    export "${image_variable}=${previous_tag}"
    app_compose up -d --no-build --wait --wait-timeout 120 "${api_service}" "${web_service}" || true
  fi
  echo "Release failed. Database backup is available at ${backup_file}." >&2
  exit 1
fi

app_compose exec -T "${web_service}" node -e "require('http').get('http://127.0.0.1:3000/api/health', (response) => process.exit(response.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

mkdir -p "${state_dir}"
chmod 700 "${state_dir}"
umask 077
{
  printf 'tag=%s\n' "${release_tag}"
  printf 'commit=%s\n' "$(git -C "${project_root}" rev-parse HEAD)"
  printf 'deployed_at=%s\n' "${timestamp}"
  printf 'backup=%s\n' "${backup_file}"
} >"${state_file}"

echo "Release ${release_tag} for ${environment} completed successfully."
