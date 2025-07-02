#!/usr/bin/env bash

# exit immediately if a command exits with a non-zero status
set -e

scripts/build-all.sh emulator

scripts/cleanup-firebase.sh

echo "Running firebase emulator with demo project..."
firebase emulators:start --project emulator
