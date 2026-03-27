#!/usr/bin/env bash

# exit immediately if a command exits with a non-zero status
set -e

scripts/cleanup-firebase.sh

echo "🚀 Starting Hybrid Local Development Environment..."
echo "   - Web & API will run locally with hot reloading"
echo "   - Firebase services will run in emulators"
echo ""

# Check if .env.local-dev files exist and create them if needed
if [ ! -f "packages/web/.env.local-dev" ]; then
    echo "📝 Creating packages/web/.env.local-dev from example..."
    cp packages/web/.env.local-dev.example packages/web/.env.local-dev
fi

if [ ! -f "packages/api/.env.local-dev" ]; then
    echo "📝 Creating packages/api/.env.local-dev from example..."
    cp packages/api/.env.local-dev.example packages/api/.env.local-dev
fi

echo "🔧 Starting Firebase emulators in background..."

# Start Firebase emulators with local-dev project
firebase emulators:start \
  --only=auth,firestore,storage \
  --project local-dev \
  --import=./firebase-data \
  --export-on-exit=./firebase-data \
  &
FIREBASE_PID=$!

# Wait a bit for emulators to start
echo "⏳ Waiting for Firebase emulators to initialize..."
sleep 5

# Function to cleanup background processes
cleanup() {
    echo ""
    echo "🛑 Stopping all services..."
    kill $FIREBASE_PID 2>/dev/null || true
    kill $WEB_PID 2>/dev/null || true
    kill $API_PID 2>/dev/null || true
    exit 0
}

# Set up cleanup trap
trap cleanup SIGINT SIGTERM

echo "🌐 Starting Web development server..."
cd packages/web
pnpm run dev:local &
WEB_PID=$!
cd ../..

echo "🔧 Starting API development server..."
cd packages/api
pnpm run dev:local &
API_PID=$!
cd ../..

echo ""
echo "✅ Hybrid Local Development Environment is running!"
echo ""
echo "🌐 Web application: http://localhost:5173"
echo "🔧 API server: http://localhost:3000"
echo "🔥 Firebase emulators UI: http://localhost:4000"
echo "🔐 Firebase Auth emulator: http://localhost:9099"
echo "📁 Firestore emulator: http://localhost:8080"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for any process to exit
wait
