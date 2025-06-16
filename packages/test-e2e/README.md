# Sapie E2E Tests

This directory contains end-to-end tests for the Sapie application using Playwright. The tests validate the integration between the React frontend and NestJS API when running on Firebase Emulator.

## Setup

### Prerequisites

1. Node.js 22.x (see root `.nvmrc`)
2. pnpm package manager
3. Firebase CLI installed globally

### Installation

1. Install dependencies:
   ```bash
   cd test-e2e
   pnpm install
   ```

2. Install Playwright browsers:
   ```bash
   pnpm run install
   ```

## Running Tests

### With Firebase Emulator Auto-Start

The Playwright config is set up to automatically start the Firebase emulator before running tests:

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

### With Manual Firebase Emulator

If you prefer to start the Firebase emulator manually:

1. From the root directory, start the emulator:
   ```bash
   cd ..
   firebase emulators:start
   ```

2. In another terminal, run tests:
   ```bash
   cd test-e2e
   pnpm test
   ```

## Test Structure

- `tests/app.spec.ts` - Frontend integration tests

## Test Configuration

The tests are configured to:
- Run against Firebase Emulator on `http://localhost:5000`
- Test multiple browsers (Chrome, Firefox, Safari)
- Include mobile viewport testing
- Automatically start/stop Firebase emulator
- Generate HTML reports

## Viewing Test Reports

After running tests, view the HTML report:

```bash
pnpm test:report
```

## CI/CD Integration

The tests are configured to work in CI environments:
- Automatic retry on failure
- Single worker mode for CI
- Fail build if `test.only` is found
- Generate trace files for debugging failures

## Firebase Emulator Ports

- **Frontend**: http://localhost:5000
- **API**: http://localhost:5001/sapie-b09be/us-central1/api/api
- **Emulator UI**: http://localhost:4000

## Troubleshooting

### Emulator doesn't start
- Check if ports 5000/5001 are already in use
- Ensure Firebase CLI is installed and logged in
- Check that `firebase.json` exists in root directory

### Tests fail to find elements
- Use `pnpm test:headed` to see what's happening
- Use `pnpm test:debug` to step through tests
- Check if the Firebase emulator is running properly

### Browser installation issues
- Run `pnpm run install` to reinstall browsers
- Check available disk space
- Try clearing Playwright cache 
