#!/usr/bin/env bash

# exit immediately if a command exits with a non-zero status
set -e

echo "Running api unit tests..."
cd api && pnpm test && cd ..
echo "OK"

echo "Running api e2e tests..."
cd api && pnpm test:e2e && cd ..
echo "OK"

echo "Building web..."
cd web && pnpm run build && cd ..
echo "OK"

echo "Building api..."
cd api && pnpm run build:firebase && cd ..
echo "OK"

echo "Running firebase emulator..."
firebase emulators:start
