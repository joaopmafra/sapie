#!/usr/bin/env bash

# exit immediately if a command exits with a non-zero status
set -e

echo "Formatting packages/api..."
cd packages/api
pnpm run format
cd ../..
printf "OK\n\n"

echo "Formatting packages/web..."
cd packages/web
pnpm run format
cd ../..
printf "OK\n\n"
