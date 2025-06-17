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

## Quick Start

### Prerequisites

- **Node.js**: 22.x (see `.nvmrc` and `.npmrc`)
- **Package Manager**: [pnpm](https://pnpm.io/installation) (required)
- **Firebase CLI**: Required for deployment and emulators

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

### Start Development

```bash
# Build all packages
pnpm run build

# Start Firebase emulator with all services
pnpm run emulator
```

This provides:
- **Web App**: http://localhost:5000
- **API**: http://localhost:5001/sapie-b09be/us-central1/api
- **Emulator UI**: http://localhost:4000

## Package Documentation

For detailed documentation on each package:

- **[Web App](./packages/web/README.md)** - React frontend development and testing
- **[API](./packages/api/README.md)** - NestJS backend development, endpoints, and testing  
- **[E2E Tests](./packages/test-e2e/README.md)** - End-to-end testing with Playwright

## Development

### Firebase Emulator (Recommended)

Start the Firebase emulator to run both web and API locally:
```bash
firebase emulators:start
```

Or use the workspace script:
```bash
pnpm run emulator
```

### Development Servers (Alternative)

For faster development iteration, run services separately:

```bash
# Terminal 1: Start API in development mode
cd packages/api && pnpm run dev

# Terminal 2: Start web app in development mode  
cd packages/web && pnpm run dev
```

This starts:
- **API**: http://localhost:3000
- **Web App**: http://localhost:5173 (with API proxy configured)

## Workspace Scripts

Common workspace-level commands:

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

## Testing

### Workspace-Level Testing
```bash
# Run all tests (unit + e2e for all packages)
pnpm run test
```

For package-specific testing, see individual package READMEs:
- [API Testing](./packages/api/README.md#testing)
- [Web Testing](./packages/web/README.md#code-quality)
- [E2E Testing](./packages/test-e2e/README.md#running-tests)

## Code Quality

### Workspace Verification
```bash
# Run lint and format check across all packages
pnpm run verify
```

Each package has its own code quality configuration. See individual package READMEs for specific commands.

## Deployment

### Firebase Hosting

Deploy the complete application to Firebase:

```bash
firebase deploy
```

Or build first, then deploy:
```bash
pnpm run build
firebase deploy
```

This will:
1. Build the web app (`packages/web/dist`)
2. Build the API for Firebase Functions (`packages/api/dist`)
3. Deploy both to Firebase

After deployment, your application will be available at [https://sapie-b09be.web.app](https://sapie-b09be.web.app).

## Firebase Emulator Management

```bash
# Kill Firebase emulators
pkill -f "firebase.*emulator"

# Start Firebase emulators
firebase emulators:start

# Start only Firebase functions emulator
firebase emulators:start --only functions

# Start only Firebase hosting emulator  
firebase emulators:start --only hosting
```

## Environment Requirements

- **Node.js**: 22.x (see `.nvmrc`)
- **Package Manager**: pnpm (defined in `packageManager` field)
- **Firebase CLI**: Required for deployment and emulators
- **Workspace**: PNPM workspace configuration for unified dependency management
