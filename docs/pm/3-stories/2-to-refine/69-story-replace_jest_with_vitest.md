# Story 69: Replace Jest with Vitest (api, web, monorepo tooling)

## Description

As a developer, I want a single modern test runner (Vitest) across Sapie's unit-test packages, so that the web app can
use the same Vite transform pipeline as dev/build (including `import.meta.env`), we can remove Jest-only workarounds like
`viteEnvBridge.ts`, and tests stay simpler to configure and faster to run where watch mode is useful.

## Details

Today:

- **`packages/web`** — Jest + `babel-jest`, dual projects (`unit` vs `mdxeditor` with a special
  `transformIgnorePatterns` hack for ESM-only `@mdxeditor/editor`). `import.meta` cannot be parsed in tested modules,
  which forced `bridgeViteEnvToGlobal()`, `__SAPIE_VITE_*` globals, and `JEST_WORKER_ID` branches in
  `note-editor-save-status.ts` and `noteBodyEditorVariant.ts`.
- **`packages/api`** — Jest + `ts-jest`, `jest.setup.ts`, Firebase test-unit emulator (Docker), `maxWorkers: 1` for
  emulator isolation. Reserved `test/jest-e2e.json` for future deployed-environment API tests (no tests today).
- **`packages/test-e2e`** — **Playwright only** (no Jest). This story does **not** replace Playwright; it aligns
  documentation and monorepo scripts so "unit tests" means Vitest and "E2E" means Playwright (+ optional future API
  integration tests).

### Why Vitest (vs keeping Jest)

- **Same pipeline as Vite (web)** — `import.meta.env`, `.env` modes, ESM dependencies (e.g. MDXEditor) without a
  separate Babel config.
- **Less glue code** — Target state: delete `packages/web/src/config/viteEnvBridge.ts` and read env directly in app and
  tests; drop `babel-jest` / dual Jest projects when one Vitest config + Vite `server.deps` / `ssr.noExternal` (or
  equivalent) covers MDXEditor.
- **Faster feedback** — Native watch mode with Vite's transform cache (optional for local TDD; API may still prefer
  deliberate runs — see [unit testing strategy](../../dev/unit_testing_strategy.md#watch-mode-and-the-limits-of-mockist-tests)).
- **API-friendly** — Vitest runs in Node without Vite for NestJS; `vi` API is largely Jest-compatible (`vi.fn`,
  `vi.spyOn`, `vi.mock`).
- **Monorepo consistency** — One runner vocabulary in docs, CI, and `pnpm test` scripts.

### Simplicity goal (web)

After migration, prefer:

```ts
export const NOTE_BODY_AUTOSAVE_DEBOUNCE_MS = import.meta.env.DEV ? 2000 : 5000;
```

and `getNoteBodyEditorVariant()` reading `import.meta.env.VITE_NOTE_EDITOR` (with Vitest `vi.stubEnv` where tests need
overrides), not `globalThis.__SAPIE_*` or `process.env.JEST_WORKER_ID`.

## Epic

Developer experience / toolchain (no dedicated epic file yet).

## Dependencies

- [ ] None blocking start. Prefer completing in-flight editor stories before large test churn to reduce merge pain.
- [ ] Firebase test-unit emulator scripts (`scripts/emulator-test-unit-start.sh`, `verify-all-test-unit.sh`) must keep
  working for API Vitest runs.

## Acceptance Criteria

- [ ] `pnpm test` at repo root (via `scripts/verify-test-all.sh` / `verify-all-test-unit.sh`) passes with Vitest for
  **api** and **web** unit suites — same behavioral coverage as today (no tests deleted without justification).
- [ ] **Web:** `viteEnvBridge.ts` removed; `main.tsx` no longer bridges Vite env to `globalThis` for tests; modules
  under test may use `import.meta.env` without parse errors.
- [ ] **Web:** No `jest`, `babel-jest`, or `jest.config.js` in `packages/web`; `pnpm test` and `pnpm test:watch` invoke
  Vitest.
- [ ] **API:** No Jest in `packages/api` devDependencies; `pnpm test` invokes Vitest; emulator-backed specs still pass
  with `maxWorkers`/pool isolation equivalent to today's `maxWorkers: 1`.
- [ ] **Monorepo:** Root `package.json` `test:api` / `test:web` and dev docs describe Vitest, not Jest.
- [ ] **test-e2e:** README (and any cross-links) state clearly: E2E = Playwright; unit = Vitest in api/web. No false
  expectation that `packages/test-e2e` runs Jest.
- [ ] Reserved API `test:e2e` config renamed or re-documented (e.g. `vitest.e2e.config.ts`) if still present; no
  references to `jest-e2e.json` in active docs unless file is intentionally kept until Story 19.

## Technical Requirements

- [ ] Vitest version aligned with monorepo **Vite 6** / **Node** versions in use.
- [ ] **Web:** `vitest.config.ts` extends or shares `vite.config.ts` (plugins, resolve, env). `environment: 'jsdom'`.
  `@testing-library/react` + `@testing-library/jest-dom` (package name can stay; import path unchanged).
- [ ] **Web:** MDXEditor suite runs in the same Vitest setup as other tests, or a **single** Vitest project with
  documented `deps.inline` / `server.deps` — no second runner.
- [ ] **API:** `environment: 'node'`; `setupFiles` equivalent to `jest.setup.ts` (`CURRENT_ENV=test-unit`, emulator
  hosts); preserve `testRegex` / `*.spec.ts` co-location.
- [ ] **API:** Classical testing rules unchanged — real emulator, `FakeAuthGuard`, avoid mocking internal Nest providers
  ([unit_testing_sapie.md](../../dev/unit_testing_sapie.md)).
- [ ] Migrate `jest.fn` / `jest.spyOn` / `jest.mock` → `vi.*` in spec files; use `vi.hoisted` where hoisting matters.
- [ ] CI: no change to emulator start/stop contract unless Vitest pool requires it (document any change).

## Tasks

### Discovery and spike

- [ ] **Inventory** — List all Jest configs, setup files, and `jest.*` usages in `packages/api`, `packages/web`, root
  scripts, and `docs/dev/*testing*`.
- [ ] **Spike web MDXEditor** — Confirm one Vitest config runs `RichNoteBodyEditor.test.tsx` without the Jest
  `transformIgnorePatterns` hack; record required `vite`/`vitest` `deps` settings.
- [ ] **Spike api Nest** — Run one existing `*.spec.ts` under Vitest with `@nestjs/testing` + supertest + emulator;
  confirm `maxWorkers: 1` or `pool: 'forks'` / `fileParallelism: false` preserves isolation.

### Phase 1 — `packages/web` (highest simplification win)

- [ ] Add Vitest + config; `pnpm test` / `test:watch` use Vitest.
- [ ] Port `setupTests.ts` to Vitest setup (e.g. `setupFiles` in vitest config).
- [ ] Port `moduleNameMapper` (CSS/assets) from `jest.config.js`.
- [ ] Migrate all `*.test.ts(x)` to `vi`; fix timing/fake timers if API differs.
- [ ] **Remove** `viteEnvBridge.ts`, `bridgeViteEnvToGlobal` call in `main.tsx`, `__SAPIE_VITE_*` reads, and
  `JEST_WORKER_ID` branches; use `import.meta.env` + `vi.stubEnv` in tests that need overrides.
- [ ] Remove Jest, babel-jest, `@types/jest`, `jest.config.js`.
- [ ] Update `packages/web/README.md` testing section.

### Phase 2 — `packages/api`

- [ ] Add Vitest config (`vitest.config.ts` or `vitest.unit.config.ts`); port `jest.setup.ts` → `vitest.setup.ts`.
- [ ] Migrate `package.json` scripts (`test`, `test:cov`, `test:debug`); drop Jest block from `package.json`.
- [ ] Migrate all `*.spec.ts` to `vi.*`.
- [ ] Rename or replace `test/jest-e2e.json` with Vitest E2E config stub for Story 19 (document only if still empty).
- [ ] Update `packages/api/README.md` and [unit_testing_sapie.md](../../dev/unit_testing_sapie.md).

### Phase 3 — Monorepo and `test-e2e` package

- [ ] Verify root `scripts/verify-all-test-unit.sh` and `pnpm test` need no Jest references.
- [ ] Update [unit_testing_react_sapie.md](../../dev/unit_testing_react_sapie.md), [contributing_guidelines.md](../../dev/contributing_guidelines.md) (if it mentions Jest), and root `README.md` testing overview.
- [ ] **test-e2e:** Audit `packages/test-e2e/README.md` and PM cross-links — Playwright remains the E2E runner; add one
  paragraph on Vitest (api/web) vs Playwright (browser/API request E2E) boundary.
- [ ] Optional: add `pnpm test:unit` alias at root if useful (api + web Vitest only).

### Cleanup and verification

- [ ] Full local run: `pnpm test` with test-unit emulator up (same as today).
- [ ] Remove unused Babel presets from web if only used for Jest.
- [ ] Grep repo for `jest` / `Jest` in active docs; leave historical `5-done` stories unchanged unless misleading.

## Out of scope

- Replacing **Playwright** in `packages/test-e2e` with Vitest Browser Mode.
- Implementing Story 19 backend E2E tests (only rename/config stub for reserved `test:e2e`).
- Adding `test:watch` to API if the team keeps deliberate-run policy (document decision in `unit_testing_sapie.md`).
- Migrating `@testing-library/jest-dom` package rename (optional cosmetic).

## Notes

- **Risk:** API emulator suite timing or open-handle detection may differ under Vitest — tune `teardownTimeout` /
  `poolOptions` if needed.
- **Risk:** Large diff touching every spec file — do web and api in separate PRs if review size matters.
- **MVP:** Toolchain improvement; schedule when editor/query stories are not in heavy flux.
- Related: [Story 19](19-add_backend_e2e_tests.md) (future Nest/API E2E vs Playwright distinction).

## References

- [Vitest — Getting Started](https://vitest.dev/guide/)
- [Vitest — Test Environment](https://vitest.dev/guide/environment.html)
- [Vitest — Migration from Jest](https://vitest.dev/guide/migration.html)
- Sapie: [unit_testing_strategy.md](../../dev/unit_testing_strategy.md), [unit_testing_sapie.md](../../dev/unit_testing_sapie.md), [unit_testing_react_sapie.md](../../dev/unit_testing_react_sapie.md)
