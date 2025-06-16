#!/usr/bin/env bash

# exit immediately if a command exits with a non-zero status
set -e

scripts/verify-all.sh

echo "Building api..."
cd api
pnpm run build:firebase
cd ..
echo "OK"

echo "Building web..."
cd web
pnpm run build
cd ..
echo "OK"
