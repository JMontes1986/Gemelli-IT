#!/usr/bin/env bash
set -euo pipefail

# Netlify provides CACHED_COMMIT_REF only when it has a previous build.
# When it is not available we must run the build to prime the cache.
if [ -z "${CACHED_COMMIT_REF:-}" ]; then
  exit 1
fi

# Trigger a new build whenever relevant workspaces or shared configuration change.
if git diff --quiet "$CACHED_COMMIT_REF" "$COMMIT_REF" -- \
  apps/web \
  apps/api \
  netlify.toml \
  package.json \
  pnpm-lock.yaml \
  pnpm-workspace.yaml \
  turbo.json \
; then
  exit 0
fi

# Returning a non-zero status forces Netlify to continue with the build.
exit 1
