#!/usr/bin/env bash

set -e

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

COMPOSE_FILE="compose.local-dev.yml"

echo "🚀 Starting Hybrid Local Development Environment..."
echo "   - Web & API run on the host with hot reloading"
echo "   - Firebase emulators run in Docker (${COMPOSE_FILE})"
echo "   - Press Ctrl+C to stop all services (Compose stack + web + API)"
echo ""

mkdir -p firebase/emulator-cache

echo "🐳 Starting emulators (Docker Compose)..."
docker compose -f "${COMPOSE_FILE}" up -d --build

cleanup() {
  echo ""
  echo "🛑 Stopping all services..."
  cd "$REPO_ROOT" || true
  docker compose -f "${COMPOSE_FILE}" stop
  if [ -n "${WEB_PID:-}" ]; then kill "$WEB_PID" 2>/dev/null || true; fi
  if [ -n "${API_PID:-}" ]; then kill "$API_PID" 2>/dev/null || true; fi
  exit 0
}

trap cleanup SIGINT SIGTERM

echo "⏳ Waiting for emulators..."
for _ in $(seq 1 60); do
  if curl -sf -o /dev/null "http://localhost:4002"; then
    break
  fi
  sleep 1
done
if ! curl -sf -o /dev/null "http://localhost:4002"; then
  echo "❌ Emulator UI did not become ready on http://localhost:4002"
  docker compose -f "${COMPOSE_FILE}" logs --tail 80 || true
  docker compose -f "${COMPOSE_FILE}" stop
  exit 1
fi

echo "🌐 Starting Web development server..."
cd packages/web
pnpm run dev:local &
WEB_PID=$!
cd "$REPO_ROOT"

echo "🔧 Starting API development server..."
cd packages/api
pnpm run dev:local &
API_PID=$!
cd "$REPO_ROOT"

wait
