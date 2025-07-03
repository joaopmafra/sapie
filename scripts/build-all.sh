#!/usr/bin/env bash

# exit immediately if a command exits with a non-zero status
set -e

printf "Building all projects...\n\n"

ENV=$1
if [[ ! $ENV =~ emulator|test-e2e|local|development|staging|production ]]; then
  echo "Usage:"
  echo "  $0 <env>"
  echo "  where <env> is equal to one of: emulator, test-e2e, local, development, staging, production"
  exit 1
fi

scripts/verify-all.sh

echo "Building api..."
cd packages/api
pnpm run build:"$ENV"
cd ../..
printf "OK\n\n"

echo "Building web..."
cd packages/web
pnpm run build:"$ENV"
cd ../..
printf "OK\n\n"
