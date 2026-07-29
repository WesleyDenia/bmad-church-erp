#!/bin/sh
set -eu

require_value() {
  name="$1"
  value="$2"

  if [ -z "$value" ]; then
    echo "Missing required environment variable: $name" >&2
    exit 1
  fi
}

validate_mysql_identifier() {
  name="$1"
  value="$2"

  case "$value" in
    ""|*[!A-Za-z0-9_]*)
      echo "$name must contain only letters, numbers and underscore." >&2
      exit 1
      ;;
  esac
}

escape_sql_string() {
  printf "%s" "$1" | sed "s/'/''/g"
}

create_database_user() {
  database="$1"
  username="$2"
  password="$3"
  escaped_password="$(escape_sql_string "$password")"

  mysql -uroot -p"${MYSQL_ROOT_PASSWORD}" <<SQL
CREATE DATABASE IF NOT EXISTS ${database}
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS '${username}'@'%' IDENTIFIED BY '${escaped_password}';
ALTER USER '${username}'@'%' IDENTIFIED BY '${escaped_password}';

GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, DROP, REFERENCES,
  CREATE TEMPORARY TABLES, LOCK TABLES
ON ${database}.*
TO '${username}'@'%';
SQL
}

require_value "MYSQL_ROOT_PASSWORD" "${MYSQL_ROOT_PASSWORD:-}"
require_value "DEV_DB_PASSWORD" "${DEV_DB_PASSWORD:-}"
require_value "STG_DB_PASSWORD" "${STG_DB_PASSWORD:-}"
require_value "PROD_DB_PASSWORD" "${PROD_DB_PASSWORD:-}"

DEV_DB_USERNAME="${DEV_DB_USERNAME:-church_erp_dev}"
STG_DB_USERNAME="${STG_DB_USERNAME:-church_erp_stg}"
PROD_DB_USERNAME="${PROD_DB_USERNAME:-church_erp_prod}"

validate_mysql_identifier "DEV_DB_USERNAME" "$DEV_DB_USERNAME"
validate_mysql_identifier "STG_DB_USERNAME" "$STG_DB_USERNAME"
validate_mysql_identifier "PROD_DB_USERNAME" "$PROD_DB_USERNAME"

create_database_user "church_erp_dev" "$DEV_DB_USERNAME" "$DEV_DB_PASSWORD"
create_database_user "church_erp_stg" "$STG_DB_USERNAME" "$STG_DB_PASSWORD"
create_database_user "church_erp_prod" "$PROD_DB_USERNAME" "$PROD_DB_PASSWORD"

mysql -uroot -p"${MYSQL_ROOT_PASSWORD}" <<SQL
FLUSH PRIVILEGES;
SQL
