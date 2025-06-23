#!/usr/bin/env bash

# exit immediately if a command exits with a non-zero status
set -e

echo "Linting packages/api..."
cd packages/api
pnpm run lint
cd ../..
echo "OK"

echo "Linting packages/web..."
cd packages/web
pnpm run lint:fix
cd ../..
echo "OK"
