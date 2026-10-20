#!/bin/sh
set -e

# The upstream image runs files in docker-entrypoint-initdb.d as the `mysql`
# user. Docker Compose mounts file-based secrets with their host permissions,
# so a secret generated with mode 0600 cannot be read by that user. Copy only
# the files needed during initialisation into container-local, mysql-owned
# files before delegating to the upstream entrypoint. The copies disappear with
# the container and do not change the permissions of host secrets.
prepare_secret_for_mysql() {
  variable_name="$1"
  eval "source_file=\${${variable_name}:-}"

  [ -n "${source_file}" ] || return 0

  if [ ! -r "${source_file}" ]; then
    echo "Secret file for ${variable_name%_FILE} is not readable." >&2
    exit 1
  fi

  target_file="/run/church-erp-init-secrets/${variable_name}"
  cat "${source_file}" >"${target_file}"
  chown mysql:mysql "${target_file}"
  chmod 0400 "${target_file}"
  eval "export ${variable_name}=\${target_file}"
}

if [ "$(id -u)" = "0" ]; then
  install -d -o mysql -g mysql -m 0700 /run/church-erp-init-secrets

  prepare_secret_for_mysql MYSQL_ROOT_PASSWORD_FILE
  prepare_secret_for_mysql DEV_DB_PASSWORD_FILE
  prepare_secret_for_mysql STG_DB_PASSWORD_FILE
  prepare_secret_for_mysql PROD_DB_PASSWORD_FILE
fi

exec /usr/local/bin/docker-entrypoint.sh "$@"
