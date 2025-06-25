#!/usr/bin/env bash

# exit immediately if a command exits with a non-zero status
set -e

echo "Linting packages/api..."
cd packages/api
pnpm run lint
cd ../..
printf "OK\n\n"

echo "Linting packages/web..."
cd packages/web
pnpm run lint:fix
cd ../..
printf "OK\n\n"

