#!/usr/bin/env bash

# exit immediately if a command exits with a non-zero status
set -e

scripts/build-all.sh

echo "Running api unit tests..."
cd api
pnpm test
cd ..
echo "OK"

# TODO add web unit tests and run them here

echo "Running api e2e tests..."
cd api
pnpm test:e2e
cd ..
echo "OK"

echo "Running app e2e tests..."
cd test-e2e
pnpm run test
cd ..
echo "OK"
