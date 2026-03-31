#!/usr/bin/env bash

set -euo pipefail

COMPOSE_FILE="compose.test-unit.yml"
CONTAINER_NAME="sapie-firebase-test-emulator"

echo "🔍 Checking Firebase test emulator container status..."

# Check if the container is already running
RUNNING_CONTAINER_ID="$(docker ps -q -f "name=^${CONTAINER_NAME}$" || true)"

if [ -n "${RUNNING_CONTAINER_ID}" ]; then
  echo "✅ Firebase test emulator is already running (container: ${CONTAINER_NAME})."
  exit 0
fi

echo "🚀 Starting Firebase test emulator container using ${COMPOSE_FILE}..."
docker compose -f "${COMPOSE_FILE}" up
