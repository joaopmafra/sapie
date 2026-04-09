#!/usr/bin/env bash

docker compose -f compose.dev-local.yml logs -n 100 --follow
