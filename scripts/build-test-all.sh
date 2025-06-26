#!/usr/bin/env bash

# exit immediately if a command exits with a non-zero status
set -e

scripts/build-all.sh

echo "Running api unit tests..."
cd packages/api
pnpm test
cd ../..
printf "OK\n\n"

# TODO add web unit tests and run them here

# Clean up any running Firebase instances before running tests
./scripts/cleanup-firebase.sh

echo "Running api e2e tests..."
cd packages/api
pnpm test:e2e
cd ../..
printf "OK\n\n"

echo "Running app e2e tests..."
cd packages/test-e2e
pnpm run test
cd ../..
printf "OK\n\n"
