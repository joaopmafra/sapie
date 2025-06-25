#!/usr/bin/env bash

# exit immediately if a command exits with a non-zero status
set -e

scripts/format-all.sh

scripts/lint-all.sh
