#!/usr/bin/env bash

docker compose -f compose.test-e2e.yml logs -n 100 --follow
