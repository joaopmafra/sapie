# Plan (deferred): Docker / Compose layout under `docker/`

**Status:** deferred — implement after higher-priority emulator work (e.g. Phases D–F in [firebase_emulators_docker_plan.md](firebase_emulators_docker_plan.md)) if we still want cleaner hand-run Compose workflows.

## Objective

Reorganize emulator-related artifacts so each environment can use **default Compose filenames** and **no `-f` flag**:

```bash
cd docker/test-unit && docker compose up -d
cd docker/local-dev && docker compose up -d
```

## Target layout (sketch)

```text
docker/
  Dockerfile.firebase-emulators    # generic image (build context = repo root)
  local-dev/
    compose.yml                    # or compose.yaml
    firebase.json                  # emulator-only config (today: firebase.local-dev.json)
  test-unit/
    compose.yml
    firebase.json                  # today: firebase.test-unit.json
  # Later: emulator/, test-e2e/ — same pattern
```

Keep **root** [`firebase.json`](../../firebase.json) as the source of truth for deploy / hosting / functions unless we explicitly split that story later.

## Why bother

- Hand-run commands match common Compose habits (`compose.yml` in cwd).
- Per-env folder groups compose + emulator JSON in one place.
- Root directory stays less crowded as more profiles appear.

## Implementation checklist (when picked up)

1. Create `docker/` tree; move the Dockerfile and add per-env folders with `compose.yml` + renamed `firebase.json`.
2. **Build:** `build.context` = repo root (`..` / `../..` from the compose file — verify against Compose version). `dockerfile` path relative to **context** (e.g. `docker/Dockerfile.firebase-emulators`).
3. **Volumes:** paths relative to the **compose file’s directory** — e.g. `../../.firebaserc`, `../../firebase/emulator-cache`, `../../firebase/data-local-dev`. Double-check every bind mount after the move.
4. **Project name:** set `name:` in each compose file if we need stable container names (today: `sapie-test-unit`, `sapie-local-dev`) or accept Compose’s directory-derived default.
5. Update scripts: [`scripts/dev-local.sh`](../../scripts/dev-local.sh), [`scripts/cleanup-firebase.sh`](../../scripts/cleanup-firebase.sh), [`scripts/test-emulator-start.sh`](../../scripts/test-emulator-start.sh), [`scripts/test-emulator-stop.sh`](../../scripts/test-emulator-stop.sh), [`scripts/test-emulator-remove.sh`](../../scripts/test-emulator-remove.sh), [`scripts/build-test-all.sh`](../../scripts/build-test-all.sh) if referenced.
6. Update [firebase_emulators_docker_plan.md](firebase_emulators_docker_plan.md) and any README / contributing / unit-testing doc paths.
7. Grep the repo for `compose.local-dev`, `compose.test-unit`, `firebase.local-dev`, `firebase.test-unit`, `Dockerfile.firebase-emulators`.

## Risks / notes

- Running `docker compose` from the **wrong cwd** breaks relative mounts; document “always `cd docker/<env>` first” or provide thin wrapper scripts.
- This is a **churn-heavy** refactor with little runtime benefit if everything is already driven by scripts — revisit priority when adding `compose.emulator.yml` / `compose.test-e2e.yml`.
