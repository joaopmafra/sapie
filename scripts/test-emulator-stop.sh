#!/usr/bin/env bash

set -euo pipefail

COMPOSE_FILE="compose.test-unit.yml"
CONTAINER_NAME="sapie-firebase-test-emulator"

echo "🔍 Checking Firebase test emulator container status..."

CONTAINER_ID="$(docker ps -aq -f "name=^${CONTAINER_NAME}$" || true)"

if [ -z "${CONTAINER_ID}" ]; then
  echo "ℹ️  No Firebase test emulator container named ${CONTAINER_NAME} found. Nothing to stop."
  exit 0
fi

echo "🛑 Stopping Firebase test emulator using ${COMPOSE_FILE}..."
docker compose -f "${COMPOSE_FILE}" stop

echo "✅ Firebase test emulator stopped."
