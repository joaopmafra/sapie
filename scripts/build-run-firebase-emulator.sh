#!/usr/bin/env bash

# exit immediately if a command exits with a non-zero status
set -e

scripts/build-all.sh

echo "Running firebase emulator..."
firebase emulators:start
