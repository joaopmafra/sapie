#!/usr/bin/env bash

# exit immediately if a command exits with a non-zero status
set -e

echo "Verifying api..."
cd packages/api
pnpm run verify:all
cd ../..
printf "OK!\n\n"

echo "Verifying web..."
cd packages/web
pnpm run verify:all
cd ../..
printf "OK!\n\n"
