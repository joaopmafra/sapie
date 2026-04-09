#!/usr/bin/env bash
# Build web+api for `emulator`, then run the full Firebase emulator suite via Docker Compose
# (compose.emulator.yml — dist mounts + pnpm prod install into firebase/api-node_modules).

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

scripts/build-all.sh emulator

echo "Starting full Firebase emulator stack in Docker (compose.emulator.yml)..."
echo "Hosting: http://localhost:5000 — stop with Ctrl+C or: docker compose -f compose.emulator.yml down"
docker compose -f compose.emulator.yml up --build
