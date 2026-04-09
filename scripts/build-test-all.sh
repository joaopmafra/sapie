#!/usr/bin/env bash

# TODO: rename to test-all.sh

# exit immediately if a command exits with a non-zero status
set -e

echo "Verifying api..."
cd packages/api
pnpm verify:all
cd ../..
printf "OK\n\n"

echo "Starting Firebase Emulators for unit tests..."
./scripts/test-emulator-start.sh
printf "OK\n\n"

echo "Running api unit tests..."
cd packages/api
pnpm test
cd ../..
printf "OK\n\n"

if [ -n "${CI:-}" ]; then
  echo "Stopping Firebase Emulators for unit tests (CI)..."
  ./scripts/test-emulator-stop.sh
  printf "OK\n\n"
fi

echo "Verifying web..."
cd packages/web
pnpm verify:all
cd ../..
printf "OK\n\n"

echo "Running web unit tests..."
cd packages/web
pnpm test
cd ../..
printf "OK\n\n"

echo "Building all for E2E tests..."
scripts/build-all.sh test-e2e
printf "OK\n\n"

echo "Starting Firebase Emulators for E2E tests..."
docker compose -f compose.test-e2e.yml up --build -d --wait
printf "OK\n\n"

echo "Running E2E tests..."
cd packages/test-e2e
pnpm run test
cd ../..
printf "OK\n\n"

echo "Stoping Firebase Emulators for E2E tests..."
docker compose -f compose.test-e2e.yml down
printf "OK\n\n"
