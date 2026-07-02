# @sapie/test-e2e — Agent Instructions

Playwright end-to-end tests for the Sapie full-stack app.
See root [AGENTS.md](../../AGENTS.md) for project-wide context and MVP priorities.

**Note:** E2E tests are **not maintained** during the MVP push unless a story explicitly
requires them. See root `AGENTS.md` §Development principles.

## Running tests

1. Start the emulator stack: `docker compose -f compose.test-e2e.yml up --build -d --wait`
2. Build all packages: `./scripts/build-all.sh test-e2e`
3. Run tests: `cd packages/test-e2e && npx playwright test`
4. Stop: `docker compose -f compose.test-e2e.yml down`

**One stack at a time** — the E2E compose file uses the same ports as the full emulator stack.

## Test structure

- `tests/` — organized by feature area:
  - `api/` — direct API endpoint tests
  - `auth/` — authentication flow tests
  - `content/` — note/folder CRUD tests
  - `navigation/` — routing and sidebar tests
  - `helpers/` — shared utilities (auth, API client setup)
- `app.spec.ts` — app-level smoke test

## Auth in tests

- Create a test user via the Firebase Auth emulator REST API before tests:
  ```
  POST http://localhost:9100/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-key
  ```
- Use the returned `idToken` for authenticated API requests.
- Auth port in E2E compose: `9100` (same as local dev).

## Key conventions

- `playwright.config.ts` at package root — base URL, test directory, reporters.
- Screenshots go to `screenshots/` on failure (configured in playwright.config.ts).
- Use `scripts/wait-emulator-ready.sh` to poll emulator health before test runs in CI.
- Prefer `page.route()` for API mocking over modifying backend state.
