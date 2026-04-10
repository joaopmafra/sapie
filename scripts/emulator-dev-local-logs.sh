#!/usr/bin/env bash

docker compose -f compose.local-dev.yml logs -n 100 --follow
