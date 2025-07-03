#!/usr/bin/env bash

# exit immediately if a command exits with a non-zero status
set -e

ENV=$1
if [[ ! $ENV =~ dev|staging|prod ]]; then
  echo "Usage:"
  echo "  $0 <env>"
  echo "  where <env> is equal to one of: dev, staging, prod"
  exit 1
fi

scripts/build-all.sh "$ENV"

firebase deploy --project "$ENV"
