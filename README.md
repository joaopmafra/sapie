# Sapie

Sapie is a knowledge management app built with React (web frontend) and NestJS (API backend), deployed on Firebase.

## Project Structure

```
sapie/
├── packages/
│   ├── web/          # React web application (Vite + TypeScript)
│   ├── api/          # NestJS API backend
│   └── test-e2e/     # End-to-end tests (Playwright)
├── scripts/          # Build and verification scripts
├── docs/             # Project documentation
├── firebase.json     # Firebase configuration
├── pnpm-workspace.yaml # PNPM workspace configuration
└── README.md         # This file
```

## Architecture

- **Frontend**: React 19 with TypeScript, Material-UI, and Vite
- **Backend**: NestJS API with TypeScript
- **Deployment**: Firebase Hosting (web) + Firebase Functions (API)
- **Development**: Firebase Emulator Suite for local development
- **Package Management**: PNPM workspace with unified dependency management
- **Code Quality**: ESLint + Prettier integration across all packages
- **CI/CD Pipeline**: NOT IMPLEMENTED YET

## Setup

### Prerequisites

[Install pnpm globally](https://pnpm.io/installation)

Install NestJS CLI globally:
```bash
pnpm add -g @nestjs/cli
```

### Install Dependencies

From the project root:
```bash
# Install all dependencies for all packages
pnpm install
```

The PNPM workspace will automatically install dependencies for all packages (`web`, `api`, and `test-e2e`).

## Development

### Firebase Emulator

Start the Firebase emulator to run both web and API locally:
```bash
firebase emulators:start
```

Or use the workspace script:
```bash
pnpm run emulator
```

The emulator will start and provide you with:
- **Web App**: http://localhost:5000
- **API**: http://localhost:5001/sapie-b09be/us-central1/api
- **Emulator UI**: http://localhost:4000

### Development Servers (Alternative)

For faster development, you can run the services separately:

```bash
# Terminal 1: Start API in development mode
cd packages/api && pnpm run dev

# Terminal 2: Start web app in development mode  
cd packages/web && pnpm run dev
```

This will start:
- **API**: http://localhost:3000
- **Web App**: http://localhost:5173 (with API proxy configured)

## Workspace Scripts

The project includes workspace-level scripts for common tasks:

```bash
# Verify code quality (lint + format check) across all packages
pnpm run verify

# Build all packages
pnpm run build

# Run all tests (includes build, unit tests, e2e tests)
pnpm run test

# Start Firebase emulator with all services
pnpm run emulator
```

## API Endpoints

### Health Check
- **URL**: `/api/health`
- **Method**: GET
- **Response**: 
  ```json
  {
    "status": "ok",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
  ```

### Testing the API

```bash
# Test locally (Firebase emulator)
curl -X GET http://127.0.0.1:5001/sapie-b09be/us-central1/api/health

# Test locally (development server)
curl -X GET http://localhost:3000/api/health

# Test in production
curl -X GET https://sapie-b09be.web.app/api/health
```

## Testing

### Workspace-Level Testing
```bash
# Run all tests (unit + e2e for all packages)
pnpm run test
```

### API Tests
```bash
cd packages/api

# Run unit tests
pnpm test

# Run e2e tests
pnpm test:e2e

# Run all tests
pnpm test:all

# Run tests with coverage
pnpm test:cov
```

### Web Tests
```bash
cd packages/web

# Run linting
pnpm lint

# Check code formatting
pnpm run format:check
```

### E2E Integration Tests
```bash
cd packages/test-e2e

# Install dependencies and browsers
pnpm install
pnpm run install

# Run E2E tests (starts Firebase emulator automatically)
pnpm test

# Run tests in headed mode
pnpm test:headed

# Run tests with UI mode
pnpm test:ui

# View test reports
pnpm test:report
```

The E2E tests validate the integration between the React frontend and NestJS API using Playwright. They automatically start and stop the Firebase emulator for testing.

## Code Quality

### Verification
```bash
# Run lint and format check across all packages
pnpm run verify
```

### Individual Package Commands
```bash
# API
cd packages/api
pnpm run lint          # Lint with auto-fix
pnpm run lint:check    # Lint without fixes
pnpm run format        # Format code
pnpm run format:check  # Check formatting

# Web
cd packages/web
pnpm run lint          # Lint with auto-fix
pnpm run format        # Format code
pnpm run format:check  # Check formatting
```

## Deployment

### Firebase Hosting

Deploy the complete application to Firebase:

```bash
firebase deploy
```

Or use the workspace build script first:
```bash
pnpm run build
firebase deploy
```

This will:
1. Build the web app (`packages/web/dist`)
2. Build the API for Firebase Functions (`packages/api/dist`)
3. Deploy both to Firebase

After deployment, your application will be available at [https://sapie-b09be.web.app](https://sapie-b09be.web.app).

## Useful Commands

```bash
# Kill Firebase emulators
pkill -f "firebase.*emulator"

# Start Firebase emulators
firebase emulators:start

# Start only Firebase functions emulator
firebase emulators:start --only functions

# Start only Firebase hosting emulator  
firebase emulators:start --only hosting

# Workspace commands
pnpm run build         # Build all packages
pnpm run verify        # Verify code quality
pnpm run test          # Run all tests
pnpm run emulator      # Start Firebase emulator

# Individual package builds
cd packages/web && pnpm run build
cd packages/api && pnpm run build:firebase
```

## Environment Requirements

- **Node.js**: 22.x (see `.nvmrc`)
- **Package Manager**: pnpm (defined in `packageManager` field)
- **Firebase CLI**: Required for deployment and emulators
- **Workspace**: PNPM workspace configuration for unified dependency management
