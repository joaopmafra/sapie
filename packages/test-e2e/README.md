# Sapie E2E Tests

End-to-end tests for the Sapie application using Playwright. The tests validate the integration between the React frontend and NestJS API when running on Firebase Emulator.

## Architecture

- **Testing Framework**: Playwright
- **Test Runner**: Playwright Test
- **Browsers**: Chrome, Firefox, Safari (WebKit)
- **Environment**: Firebase Emulator Suite
- **Package Management**: PNPM (defined in packageManager field)

## Setup

### Prerequisites

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

### Automatic Firebase Emulator

The Playwright configuration automatically starts the Firebase emulator before running tests:

```bash
# Run all tests
pnpm test

# Run tests in headed mode (see browser)
pnpm test:headed

# Run tests with UI mode
pnpm test:ui

# Debug tests
pnpm test:debug
```

### Manual Firebase Emulator

If you prefer to start the Firebase emulator manually:

```bash
# From the project root, start the emulator
cd ../..
firebase emulators:start

# In another terminal, run tests
cd packages/test-e2e
pnpm test
```

## Test Structure

```
packages/test-e2e/
├── tests/
│   ├── app.spec.ts          # Frontend integration tests
│   └── helpers/
│       └── test-utils.ts    # Test utilities and helpers
├── test-results/            # Test execution results
├── playwright-report/       # HTML test reports
├── screenshots/             # Test screenshots
├── playwright.config.ts     # Playwright configuration
└── package.json             # Package configuration
```

## Test Configuration

The tests are configured to:
- Run against Firebase Emulator on `http://localhost:5000`
- Test multiple browsers (Chrome, Firefox, Safari)
- Include mobile viewport testing
- Automatically start/stop Firebase emulator
- Generate HTML reports with screenshots

## Viewing Test Reports

After running tests, view the HTML report:

```bash
pnpm test:report
```

## Development Commands

```bash
# Run all tests
pnpm test

# Run tests in headed mode
pnpm test:headed

# Run tests with UI mode
pnpm test:ui

# Debug tests step by step
pnpm test:debug

# View test reports
pnpm test:report

# Install Playwright browsers
pnpm run install
```

## Firebase Emulator Integration

### Automatic Management
The Playwright configuration handles Firebase emulator lifecycle:
- Starts emulator before tests
- Waits for services to be ready
- Stops emulator after tests complete

### Service Endpoints
- **Web App**: http://localhost:5000
- **API**: http://localhost:5001/sapie-b09be/us-central1/api
- **Emulator UI**: http://localhost:4000

## CI/CD Integration

The tests are configured for CI environments:
- **Single Worker**: Prevents resource conflicts
- **Automatic Retry**: Retries flaky tests
- **Build Failure**: Fails build if `test.only` is found
- **Trace Files**: Generates debugging traces for failures

## Troubleshooting

### Emulator Issues
- **Ports in use**: Check if ports 5000/5001 are already in use
- **Firebase CLI**: Ensure Firebase CLI is installed and logged in
- **Configuration**: Verify `firebase.json` exists in project root

### Test Failures
- **Headed mode**: Use `pnpm test:headed` to see what's happening
- **Debug mode**: Use `pnpm test:debug` to step through tests
- **Emulator status**: Check if Firebase emulator is running properly

### Browser Issues
- **Installation**: Run `pnpm run install` to reinstall browsers
- **Disk space**: Check available disk space
- **Cache**: Clear Playwright cache if needed

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
  // Wait for API call to complete
  await page.waitForFunction(() => 
    document.querySelector('[data-testid="health-status"]')?.textContent?.includes('ok')
  );
});
```
