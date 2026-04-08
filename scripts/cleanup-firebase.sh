#!/usr/bin/env bash

# Stops Docker-based local-dev emulators first, then cleans up legacy host Firebase processes.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "🧹 Stopping local-dev Firebase emulators (Docker Compose)..."
docker compose -f compose.local-dev.yml down 2>/dev/null || true

echo "🧹 Cleaning up legacy host Firebase emulator processes (if any)..."
pkill -f "firebase emulators" || true
pkill -f "firebase serve" || true
pkill -f "firebase-tools" || true

echo "🧹 Cleaning up host Java emulator processes tied to Firebase (if any)..."
pkill -f "java.*firestore" || true
pkill -f "java.*firebase" || true
pkill -f "java.*cloud-firestore-emulator" || true

sleep 1
echo "🎯 Ready for a fresh Firebase emulator startup."
