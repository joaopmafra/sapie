# New package: root scripts checklist

**Date:** 2026-07-02
**Context:** Adding `packages/cli/` to the Sapie monorepo.

## Rule

Every new package under `packages/<name>/` must be wired into the root scripts that
enforce quality gates. Skipping this means `pnpm run verify` won't catch regressions
in the new package.

## Checklist

When creating `packages/<name>/`:

- [ ] **`scripts/verify-all.sh`** — add a block after the last package:
  ```bash
  echo "Verifying <name>..."
  cd packages/<name>
  pnpm run verify:all
  cd ../..
  printf "OK!\n\n"
  ```

- [ ] **`scripts/lint-all.sh`** — add a block:
  ```bash
  echo "Linting packages/<name>..."
  cd packages/<name>
  pnpm run lint
  cd ../..
  printf "OK\n\n"
  ```

- [ ] **`scripts/format-all.sh`** — add a block:
  ```bash
  echo "Formatting packages/<name>..."
  cd packages/<name>
  pnpm run format
  cd ../..
  printf "OK\n\n"
  ```

- [ ] **`scripts/verify-all-test-unit.sh`** — add two blocks (verify + test):
  ```bash
  echo "Verifying <name>..."
  cd packages/<name>
  pnpm verify:all
  cd ../..
  printf "OK\n\n"

  echo "Running <name> unit tests..."
  cd packages/<name>
  pnpm test
  cd ../..
  printf "OK\n\n"
  ```

- [ ] **Root `package.json`** — add a `test:<name>` script:
  ```json
  "test:<name>": "cd packages/<name> && pnpm test"
  ```

- [ ] **Root `AGENTS.md`** — add to the "Package-scoped instructions" list:
  ```markdown
  - [packages/<name>/AGENTS.md](packages/<name>/AGENTS.md) — <description>
  ```

- [ ] **`packages/<name>/AGENTS.md`** — create following the pattern of
  `packages/api/AGENTS.md` or `packages/cli/AGENTS.md`

- [ ] **`docs/dev/README.md`** — if the package has developer documentation,
  add it to the index

## Background

The monorepo does not use pnpm workspaces. Packages are installed independently.
Each package must be explicitly included in the root quality gate scripts.

See `packages/cli/` blocks in the scripts above for the exact template.
