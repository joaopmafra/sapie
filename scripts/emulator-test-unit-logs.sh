#!/usr/bin/env bash

docker compose -f compose.test-unit.yml logs -n 100 --follow
