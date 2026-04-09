# ADR 0001: Firebase Emulator Suite in Docker (Compose)

## Status

Implemented

## Date

2026-04-09

## Context

Running Firebase emulators on the **host** often left ports and Java processes behind after shutdown, breaking the next
start. Hybrid development had previously backgrounded host emulator processes. API **unit tests** need an isolated,
repeatable Firestore + Auth emulator without colliding with day-to-day dev. The **full** product experience (Hosting +
Functions + emulators) must match deploy layout while keeping monorepo constraints (Functions expects classic
`node_modules` next to built code).

We needed a single approach that works for: hybrid local dev (Vite + Nest on host), Jest + test-unit, full emulator
(`pnpm emulator`), and Playwright E2E — without baking environment-specific Firebase config into a throwaway image per
profile.

## Decision

1. **One generic image** — `Dockerfile.firebase-emulators`: Node + JRE + pinned `firebase-tools`. **Do not** bake
   `firebase.json` or `.firebaserc` into the image; Compose bind-mounts them (and mounts the right
   `firebase.<profile>.json` as `firebase.json` in the container). Emulator start flags live in each compose file’s
   `command`.

2. **Multiple Compose files at repo root** — One file per workflow, same image:
    - `compose.local-dev.yml` — hybrid dev; project **`local-dev`** → `demo-local-dev`; `firebase.local-dev.json`
      (`host: 0.0.0.0`). **Dedicated host ports** so this stack can run alongside test-unit and full/E2E-sized stacks
      without clashes (e.g. UI **4002**, Auth **9100**, Firestore **8282** / ws **9170**, Storage **9200**, hub **4420
      **,
      logging **4520**). **`--import` / `--export-on-exit`** on `firebase/data-local-dev` (empty dir: CLI skips import,
      warns). Storage included in **`--only`** when present in config so future features do not require compose churn.
    - `compose.test-unit.yml` — Jest in `packages/api`; project **`demo-test-unit`**; `firebase.test-unit.json`; **tmpfs
      **
      for Firestore data; non-default ports (e.g. Firestore **8181**, Auth **9098**, UI **4001**) documented in
      `docs/dev/unit_testing_sapie.md`. Helpers: `scripts/emulator-test-unit-start.sh`,
      `scripts/emulator-test-unit-stop.sh`, `scripts/emulator-test-unit-remove.sh`.
    - `compose.emulator.yml` — full stack in Docker; **`pnpm emulator`** → `scripts/build-run-on-emulator.sh` after
      `build-all.sh emulator`. Mounts **only** `packages/web/dist` and `packages/api/dist`; `firebase.emulator.json`
      (same hosting/functions paths as root `firebase.json`, `0.0.0.0` for emulators). Runs
      **`pnpm install --prod --frozen-lockfile`** using mounted `packages/api/pnpm-lock.yaml` into
      `firebase/api-node_modules` so the Functions emulator resolves dependencies reproducibly.
    - `compose.test-e2e.yml` — same published localhost surface as full emulator; project **`test-e2e`** →
      `demo-test-e2e`; **no** durable export directory in v1. Playwright does **not** start Firebase on the host;
      readiness via Functions **`/api/health`** (`packages/test-e2e/scripts/wait-emulator-ready.sh`),
      `reuseExistingServer: true`.

3. **Emulator download cache** — Bind-mount `firebase/emulator-cache` where applicable for faster cold starts.

4. **Port symmetry** — For each compose profile, **host and container use the same numeric ports** for emulators (no
   asymmetric maps like `8181:8080`) so the Emulator UI and Firestore WebSocket channels work.

5. **Non-goals (explicit)** — NestJS and Vite stay on the host for hybrid dev; production Firebase config unchanged;
   product features (e.g. spaced repetition) out of scope for this infrastructure.

## Consequences

- **Docker + Compose v2** are required for the standard **full emulator** and **E2E** paths; hybrid dev and test-unit
  emulator flows are Compose-based from the repo root.
- **Firebase CLI on the host** remains required for **deploy**; it is optional for teams that only use Compose-backed
  emulators.
- **Only one** of `compose.emulator.yml` and `compose.test-e2e.yml` should run at a time (same localhost ports). Hybrid
  **local-dev** compose can run in parallel with test-unit because it uses a different port block.
- Operational commands and copy-paste maps live in `docs/dev/ai_agent_guidelines.md`, root `README.md`, and package
  READMEs — not duplicated here.

## Related documentation (names only; paths may move)

- `docs/dev/unit_testing_sapie.md` — test-unit ports, Jest env, Firestore clear API
- `docs/plans/unit_testing_implementation_plan.md` — historical test-container steps
- `docs/plans/docker_compose_layout_refactor.md` — deferred optional compose layout under `docker/`

## Note on history

The former implementation plan `docs/plans/firebase_emulators_docker_plan.md` was removed after this ADR was added;
phase-by-phase detail remains in git history if needed.
