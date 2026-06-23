#!/usr/bin/env bash
set -euo pipefail

# Render build script — called as: bash scripts/render-build.sh <api|consumer|seller>
# Calls tsc/vite directly (not via pnpm recursive) so all error output is visible in logs.

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

ROOT="$(pwd)"

echo "==> Building service: $SERVICE"
case "$SERVICE" in
  api)
    cd "$ROOT/services/api"
    echo "--- tsc ---"
    "$ROOT/node_modules/.bin/tsc"
    ;;
  consumer)
    cd "$ROOT/apps/consumer"
    echo "--- tsc -b ---"
    "$ROOT/node_modules/.bin/tsc" -b
    echo "--- vite build ---"
    "$ROOT/node_modules/.bin/vite" build
    ;;
  seller)
    cd "$ROOT/apps/seller"
    echo "--- tsc -b ---"
    "$ROOT/node_modules/.bin/tsc" -b
    echo "--- vite build ---"
    "$ROOT/node_modules/.bin/vite" build
    ;;
  *)
    echo "Unknown service '$SERVICE'. Use: api | consumer | seller"
    exit 1
    ;;
esac

echo "==> Build complete: $SERVICE"
