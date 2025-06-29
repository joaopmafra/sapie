#!/usr/bin/env bash

# exit immediately if a command exits with a non-zero status
set -e

scripts/verify-all.sh

echo "Building api..."
cd packages/api
pnpm run build:firebase
cd ../..
printf "OK\n\n"

echo "Building web..."
cd packages/web
pnpm run build:firebase
cd ../..
printf "OK\n\n"
