#!/usr/bin/env bash

# exit immediately if a command exits with a non-zero status
set -e

echo "Verifying api..."
cd packages/api
pnpm run lint:check
pnpm run format:check
cd ../..
echo "OK"

echo "Verifying web..."
cd packages/web
pnpm run lint
pnpm run format:check
cd ../..
echo "OK"
