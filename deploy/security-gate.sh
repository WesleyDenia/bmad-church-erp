#!/usr/bin/env bash
set -euo pipefail

target_env="${1:-${DEPLOY_ENV:-dev}}"

case "${target_env}" in
  dev|local|development)
    echo "Secret scan skipped for ${target_env}; detect-secrets is enforced only for ci, stg and prod."
    exit 0
    ;;
  ci|stg|staging|prod|production)
    ;;
  *)
    echo "Unknown deploy environment: ${target_env}" >&2
    echo "Usage: $0 [dev|ci|stg|prod]" >&2
    exit 2
    ;;
esac

if command -v pre-commit >/dev/null 2>&1; then
  pre-commit run detect-secrets --all-files
  exit 0
fi

if command -v detect-secrets-hook >/dev/null 2>&1; then
  mapfile -t tracked_files < <(git ls-files)
  detect-secrets-hook \
    --baseline .secrets.baseline \
    --exclude-files '(^|/)(package-lock\.json|composer\.lock|\.secrets\.baseline)$' \
    "${tracked_files[@]}"
  exit 0
fi

echo "Secret scan is required for ${target_env}, but neither pre-commit nor detect-secrets-hook is installed." >&2
echo "Install pre-commit or detect-secrets==1.5.0 before deploying to ci/stg/prod." >&2
exit 1
