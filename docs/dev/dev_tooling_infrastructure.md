# Dev Tooling Infrastructure

## Status

Active. Last updated 2026-07-03.

## Context

As Sapie grows, manual testing and dev tooling needs a home. Today we have:

- `docs/pm/` — QA test plans (currently 1 file, expected to grow)
- `packages/test-e2e/` — Playwright E2E tests
- `scripts/` — ad-hoc utilities (nothing formal yet)

We need tooling for:
- **Data seeding** — creating reproducible test workspaces with realistic content
- **E2E fixture management** — shared test data used by Playwright tests
- **QA automation** — scripts that exercise workflows for manual QA

## Decision

### Today: start in `scripts/`

Data seeding starts as a standalone script at `scripts/seed-dev-data.ts`. It uses the Firebase Emulators and Sapie REST API directly (no dependency on the CLI's `ApiClient`), mimicking how the web app talks to the backend. This keeps the user-facing CLI clean and prevents the seed tool from masking CLI-specific bugs.

### Tomorrow: graduate to `qa/`

When **three or more** dev/QA scripts exist, or when E2E fixtures need to share the seed tree data structure, graduate to a top-level `qa/` directory:

```
qa/
  src/
    seed-tree.ts          # seed data structure (moved from scripts/)
    seed-dev-data.ts      # CLI entry point
    e2e-fixtures.ts       # shared Playwright fixtures
  package.json            # tsx, typescript deps
  tsconfig.json
```

The seed tree definition (`SeedNode` types + `seedTree()` function) is the shared asset. Both the seeding script and E2E tests import from it.

### Migration path (from scripts/ to qa/)

1. Create `qa/` with package.json, tsconfig.json.
2. Move `seedTree()` + `SeedNode` types to `qa/src/seed-tree.ts`.
3. Rewrite `scripts/seed-dev-data.ts` to import from `qa/src/seed-tree.ts`.
4. Update E2E tests to import fixtures from `qa/`.
5. Move QA test plans from `docs/pm/` into `qa/docs/` (optional, phased).

## Constraints

- **No dependency on any package's internal code.** The seed tool calls the API directly (fetch + Firebase Auth REST). This ensures it exercises the same code paths as the web app, not the CLI's `ApiClient`.
- **Firebase Emulators first.** `--emulator` flag points at `localhost:9099` (Auth) + `localhost:4001` (API). Production mode available but not primary.
- **Idempotent by name.** Re-running the seed tool skips content whose name already exists under the same parent. No tag-based dedup (avoids extra round-trips).

## Maintenance contract

Documented in root `AGENTS.md` § Settled design decisions:

> **`sapie seed` → `scripts/seed-dev-data.ts` is the canonical dev data tool.** When a new feature ships that adds a content type, tag, property, or relationship, update the seed tree. The tree is the single source of truth for manual test data.

## Related

- Root `AGENTS.md` § Settled design decisions — maintenance contract
- `packages/cli/AGENTS.md` — CLI architecture (seed tool is NOT here)
- `docs/pm/` — current QA test plans (to be migrated to `qa/docs/` eventually)
