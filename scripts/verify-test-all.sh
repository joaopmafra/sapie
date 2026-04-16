#!/usr/bin/env bash

# exit immediately if a command exits with a non-zero status
set -e

scripts/verify-all-test-unit.sh

#echo "Building all for E2E tests..."
#scripts/build-all.sh test-e2e
#printf "OK\n\n"

#echo "Starting Firebase Emulators for E2E tests..."
#docker compose -f compose.test-e2e.yml up --build -d --wait
#printf "OK\n\n"

#echo "Running E2E tests..."
#cd packages/test-e2e
#pnpm run test
#cd ../..
#printf "OK\n\n"

#echo "Stoping Firebase Emulators for E2E tests..."
#docker compose -f compose.test-e2e.yml stop
#printf "OK\n\n"
