#!/usr/bin/env bash

set -e

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

COMPOSE_LOCAL_DEV="compose.local-dev.yml"

./scripts/cleanup-firebase.sh

echo "🚀 Starting Hybrid Local Development Environment..."
echo "   - Web & API run on the host with hot reloading"
echo "   - Firebase emulators run in Docker (${COMPOSE_LOCAL_DEV})"
echo ""

if [ ! -f "packages/web/.env.local-dev" ]; then
  echo "📝 Creating packages/web/.env.local-dev from example..."
  cp packages/web/.env.local-dev.example packages/web/.env.local-dev
fi

if [ ! -f "packages/api/.env.local-dev" ]; then
  echo "📝 Creating packages/api/.env.local-dev from example..."
  cp packages/api/.env.local-dev.example packages/api/.env.local-dev
fi

mkdir -p firebase/emulator-cache

echo "🐳 Starting Firebase emulators (Docker Compose)..."
docker compose -f "${COMPOSE_LOCAL_DEV}" up -d --build

cleanup() {
  echo ""
  echo "🛑 Stopping all services..."
  cd "$REPO_ROOT" || true
  docker compose -f "${COMPOSE_LOCAL_DEV}" down
  if [ -n "${WEB_PID:-}" ]; then kill "$WEB_PID" 2>/dev/null || true; fi
  if [ -n "${API_PID:-}" ]; then kill "$API_PID" 2>/dev/null || true; fi
  exit 0
}

trap cleanup SIGINT SIGTERM

echo "⏳ Waiting for Firebase emulators (Emulator UI on port 4000)..."
for _ in $(seq 1 60); do
  if curl -sf -o /dev/null "http://localhost:4000"; then
    break
  fi
  sleep 1
done
if ! curl -sf -o /dev/null "http://localhost:4000"; then
  echo "❌ Emulator UI did not become ready on http://localhost:4000"
  docker compose -f "${COMPOSE_LOCAL_DEV}" logs --tail 80 || true
  docker compose -f "${COMPOSE_LOCAL_DEV}" down
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

echo ""
echo "✅ Hybrid Local Development Environment is running!"
echo ""
echo "🌐 Web application: http://localhost:5173"
echo "🔧 API server: http://localhost:3000"
echo "🔥 Firebase emulators UI: http://localhost:4000"
echo "🔐 Firebase Auth emulator: http://localhost:9099"
echo "📁 Firestore emulator: http://localhost:8080"
echo "📦 Storage emulator: http://localhost:9199"
echo ""
echo "Press Ctrl+C to stop all services (Compose stack + web + API)"

wait
