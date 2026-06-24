#!/usr/bin/env bash
set -euo pipefail

# Render build script — called as: bash scripts/render-build.sh <api|consumer|seller>
# Uses pnpm v9 (no supply-chain release-age policy) with --frozen-lockfile.
# Calls binaries from each package's own node_modules/.bin (pnpm doesn't hoist devDeps to root).

SERVICE="${1:-}"

if [[ -z "$SERVICE" ]]; then
  echo "Usage: bash scripts/render-build.sh <api|consumer|seller>"
  exit 1
fi

echo "==> Installing pnpm v9..."
npm install -g pnpm@9

echo "==> pnpm $(pnpm --version) / node $(node --version)"

echo "==> Installing workspace dependencies (including devDeps)..."
# Unset NODE_ENV so pnpm installs devDependencies — Render sets NODE_ENV=production
# for node web services which causes pnpm to skip devDeps (e.g. typescript, vite).
NODE_ENV= pnpm install --frozen-lockfile

echo "==> Building service: $SERVICE"
case "$SERVICE" in
  api)
    cd services/api
    echo "--- tsc ---"
    ./node_modules/.bin/tsc
    ;;
  consumer)
    cd apps/consumer
    echo "--- tsc -b ---"
    ./node_modules/.bin/tsc -b
    echo "--- vite build ---"
    ./node_modules/.bin/vite build
    ;;
  seller)
    cd apps/seller
    echo "--- tsc -b ---"
    ./node_modules/.bin/tsc -b
    echo "--- vite build ---"
    ./node_modules/.bin/vite build
    ;;
  landing)
    cd apps/landing
    echo "--- tsc -b ---"
    ./node_modules/.bin/tsc -b
    echo "--- vite build ---"
    ./node_modules/.bin/vite build
    ;;
  *)
    echo "Unknown service '$SERVICE'. Use: api | consumer | seller | landing"
    exit 1
    ;;
esac

echo "==> Build complete: $SERVICE"
