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

echo "⚠️  WARNING: This will stop the Firebase test emulator container"
echo "   and REMOVE all related Docker resources (container, network, volumes, image)."
read -r -p "Are you sure you want to proceed? [y/N]: " CONFIRM

case "${CONFIRM}" in
  [yY])
    echo "🛑 Removing Firebase test emulator and related resources using ${COMPOSE_FILE}..."
    docker compose -f "${COMPOSE_FILE}" down --rmi all -v --remove-orphans firebase-test-emulator
    echo "✅ Firebase test emulator and related volumes removed."
    ;;
  *)
    echo "❎ Operation cancelled. Emulator container and volumes were not removed."
    ;;
esac
