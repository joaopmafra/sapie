# Sapie E2E Tests

End-to-end tests for the Sapie application using Playwright. Tests run against the **Firebase Emulator Suite** in Docker: the web app is served by the **Hosting** emulator and the Nest API runs as the **`api`** **Cloud Function** (same model as `compose.emulator.yml` / `pnpm emulator`).

## Architecture

- **Testing Framework**: Playwright
- **Test Runner**: Playwright Test
- **Browsers**: Chromium (others can be re-enabled in `playwright.config.ts`)
- **Environment**: Firebase Emulator Suite in Docker ([`compose.test-e2e.yml`](../../compose.test-e2e.yml))
- **Package Management**: PNPM (see `packageManager` in this package)

### Firebase project naming

- **CLI alias** (`.firebaserc`): `test-e2e`
- **Emulator project id** (URLs, client config): `demo-test-e2e` — the `demo-` prefix keeps the Emulator Suite strictly local; see [firebase-demo-prefix.md](../../docs/research/firebase/firebase-demo-prefix.md).

## Setup

### Prerequisites

- Docker and Docker Compose v2
- `curl` on the machine that runs Playwright (for the config’s readiness poll)

Install dependencies for this package:

```bash
cd packages/test-e2e
pnpm install
```

### Install Playwright Browsers

```bash
cd packages/test-e2e
pnpm run install
```

## Running Tests

### Recommended: Docker Compose first

1. From the **repository root**, build artifacts for the `test-e2e` environment (web + API `dist/`):

   ```bash
   scripts/build-all.sh test-e2e
   ```

2. Start the emulator stack and wait until the API health check passes:

   ```bash
   docker compose -f compose.test-e2e.yml up --build -d --wait
   ```

3. Run tests (from `packages/test-e2e` or via `pnpm exec` from root as you prefer):

   ```bash
   cd packages/test-e2e
   pnpm test
   ```

4. When finished, stop the stack (from repo root):

   ```bash
   docker compose -f compose.test-e2e.yml down
   ```

Playwright’s `webServer` entry does **not** start Firebase on the host. It waits for **`GET /api/health`** on the Functions emulator (`playwright.config.ts` + [`scripts/wait-emulator-ready.sh`](./scripts/wait-emulator-ready.sh)). If the stack is already up, that URL is reused immediately (`reuseExistingServer: true`). Override polling via `E2E_READINESS_URL`, `E2E_READINESS_MAX_ATTEMPTS`, `E2E_READINESS_SLEEP_SEC` if needed.

### Port overlap

[`compose.test-e2e.yml`](../../compose.test-e2e.yml) publishes the same localhost ports as [`compose.emulator.yml`](../../compose.emulator.yml) (5000, 5001, 8080, 9099, 4000, etc.). **Only one** of these full stacks should run at a time.

### Other commands

```bash
# Headed (see the browser)
pnpm test:headed

# UI mode
pnpm test:ui

# Debug
pnpm test:debug
```

## Test Structure

```
packages/test-e2e/
├── scripts/
│   └── wait-emulator-ready.sh  # Playwright webServer: poll Functions health, then idle
├── tests/
│   ├── app.spec.ts          # Frontend integration tests
│   └── helpers/
│       └── test-utils.ts    # Test utilities and helpers
├── test-results/            # Test execution results
├── playwright-report/       # HTML test reports
├── screenshots/             # Test screenshots
├── playwright.config.ts     # Playwright configuration
└── package.json           # Package configuration
```

## Test Configuration

- **Hosting (UI)**: `http://localhost:5000` — `baseURL` in `playwright.config.ts`
- **Readiness / API health (Functions emulator)**: `http://127.0.0.1:5001/demo-test-e2e/us-central1/api/api/health`
- **Emulator UI**: `http://localhost:4000`

## Viewing Test Reports

After running tests:

```bash
pnpm test:report
```

## CI

Typical job shape:

1. Build: `scripts/build-all.sh test-e2e`
2. `docker compose -f compose.test-e2e.yml up --build -d --wait`
3. `cd packages/test-e2e && pnpm test`
4. `docker compose -f compose.test-e2e.yml down`

Do not rely on `firebase emulators:start` on the CI runner unless you intentionally deviate from this compose flow.

## Troubleshooting

### Emulator / Docker

- **Ports in use**: Stop the other full stack (`compose.emulator.yml` or any process on 5000/5001/8080/9099/4000).
- **Timeout in Playwright**: Ensure compose is healthy (`docker compose -f compose.test-e2e.yml ps`) and that you ran `build-all.sh test-e2e` so `packages/web/dist` and `packages/api/dist` exist.
- **Stale `dist`**: Re-run `scripts/build-all.sh test-e2e` after code changes.

### Test failures

- **Headed mode**: `pnpm test:headed`
- **Debug mode**: `pnpm test:debug`

### Browser issues

- Reinstall browsers: `pnpm run install`
- Check disk space and Playwright cache if installs fail

## Test Examples

### Basic Frontend Test

```typescript
import { test, expect } from '@playwright/test';

test('should display health status', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('API Health Status')).toBeVisible();
});
```

### API Integration Test

```typescript
test('should fetch and display API data', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() =>
    document
      .querySelector('[data-testid="health-status"]')
      ?.textContent?.includes('ok'),
  );
});
```
