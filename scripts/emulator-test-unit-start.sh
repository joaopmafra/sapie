#!/usr/bin/env bash

set -euo pipefail

COMPOSE_FILE="compose.test-unit.yml"
CONTAINER_NAME="sapie-firebase-test-emulator"

echo "🔍 Checking Firebase test emulators container status..."

# Check if the container is already running
RUNNING_CONTAINER_ID="$(docker ps -q -f "name=^${CONTAINER_NAME}$" || true)"

if [ -n "${RUNNING_CONTAINER_ID}" ]; then
  echo "✅ Firebase test emulator is already running (container: ${CONTAINER_NAME})."
  exit 0
fi

echo "🚀 Starting Firebase test emulators container using ${COMPOSE_FILE}..."
docker compose -f "${COMPOSE_FILE}" up -d --build

echo "⏳ Waiting for emulators..."
for _ in $(seq 1 60); do
  if curl -sf -o /dev/null "http://localhost:4001"; then
    echo "✅ Firebase test emulators started."
    break
  fi
  sleep 1
done
if ! curl -sf -o /dev/null "http://localhost:4001"; then
  echo "❌ Emulator UI did not become ready on http://localhost:4001"
  docker compose -f "${COMPOSE_FILE}" logs --tail 80 || true
  docker compose -f "${COMPOSE_FILE}" stop
  exit 1
fi
