#!/usr/bin/env bash
# Playwright webServer: wait for compose.test-e2e stack, then idle so Playwright can stop the process after tests.
set -euo pipefail

READINESS_URL="${E2E_READINESS_URL:-http://127.0.0.1:5001/demo-test-e2e/us-central1/api/api/health}"
MAX_ATTEMPTS="${E2E_READINESS_MAX_ATTEMPTS:-90}"
SLEEP_SEC="${E2E_READINESS_SLEEP_SEC:-2}"

i=0
while [ "$i" -lt "$MAX_ATTEMPTS" ]; do
  if curl -sf "$READINESS_URL" >/dev/null; then
    exec tail -f /dev/null
  fi
  i=$((i + 1))
  sleep "$SLEEP_SEC"
done

echo >&2 "Timed out waiting for E2E Firebase stack at ${READINESS_URL}."
echo >&2 "From repo root: scripts/build-all.sh test-e2e && docker compose -f compose.test-e2e.yml up --build -d --wait"
echo >&2 "See packages/test-e2e/README.md."
exit 1
