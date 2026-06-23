#!/usr/bin/env bash
set -euo pipefail

# Render build script — called as: bash scripts/render-build.sh <api|consumer|seller>
# Uses pnpm v9 to avoid the pnpm v10 24-hour supply-chain release-age policy.

SERVICE="${1:-}"

if [[ -z "$SERVICE" ]]; then
  echo "Usage: bash scripts/render-build.sh <api|consumer|seller>"
  exit 1
fi

echo "==> Installing pnpm v9..."
npm install -g pnpm@9

echo "==> Installing workspace dependencies..."
pnpm install --no-frozen-lockfile

echo "==> Building service: $SERVICE"
case "$SERVICE" in
  api)
    pnpm --filter @style-yangu/api-service... build
    ;;
  consumer)
    pnpm --filter @style-yangu/consumer... build
    ;;
  seller)
    pnpm --filter @style-yangu/seller... build
    ;;
  *)
    echo "Unknown service '$SERVICE'. Use: api | consumer | seller"
    exit 1
    ;;
esac

echo "==> Build complete: $SERVICE"
