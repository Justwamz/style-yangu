#!/usr/bin/env bash
set -euo pipefail

# Render build script — called as: bash scripts/render-build.sh <api|consumer|seller>
# Uses pnpm v9 (no supply-chain release-age policy) with --frozen-lockfile for
# deterministic installs (exact versions from the committed lockfile).

SERVICE="${1:-}"

if [[ -z "$SERVICE" ]]; then
  echo "Usage: bash scripts/render-build.sh <api|consumer|seller>"
  exit 1
fi

echo "==> Installing pnpm v9..."
npm install -g pnpm@9

echo "==> pnpm $(pnpm --version) / node $(node --version)"

echo "==> Installing workspace dependencies..."
pnpm install --frozen-lockfile

echo "==> Building service: $SERVICE"
case "$SERVICE" in
  api)
    pnpm --filter @style-yangu/api-service... build 2>&1
    ;;
  consumer)
    pnpm --filter @style-yangu/consumer... build 2>&1
    ;;
  seller)
    pnpm --filter @style-yangu/seller... build 2>&1
    ;;
  *)
    echo "Unknown service '$SERVICE'. Use: api | consumer | seller"
    exit 1
    ;;
esac

echo "==> Build complete: $SERVICE"
