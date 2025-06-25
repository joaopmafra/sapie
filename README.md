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
│   └── pm/           # Project management
├── firebase.json     # Firebase configuration
└── README.md         # This file
```

## Architecture

- **Frontend**: React 19 with TypeScript, Material-UI, and Vite
- **Backend**: NestJS API with TypeScript
- **Authentication**: Firebase Auth with FirebaseUI for login/logout flows
- **Deployment**: Firebase Hosting (web) + Firebase Functions (API)
- **Development**: Firebase Emulator Suite for local development
- **Package Management**: Each package managed independently with PNPM
- **Code Quality**: ESLint + Prettier integration across all packages
- **CI/CD Pipeline**: NOT IMPLEMENTED YET

## Development Principles

Sapie follows core development principles to maintain code quality and consistency.

For detailed development principles and their application during implementation, see the *
*[Development Principles Documentation](docs/dev/development_principles.md)**.

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

Each package must be installed separately:

```bash
# Install API dependencies
cd packages/api
pnpm install

# Install web dependencies
cd ../web
pnpm install

# Install test-e2e dependencies
cd ../test-e2e
pnpm install
```

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
- **Firebase Auth Emulator**: http://localhost:9099

## Package Documentation

For detailed documentation on each package:

- **[Web App](./packages/web/README.md)** - React frontend development and testing
- **[API](./packages/api/README.md)** - NestJS backend development, endpoints, and testing
- **[E2E Tests](./packages/test-e2e/README.md)** - End-to-end testing with Playwright

## Authentication

Sapie includes user authentication powered by **Firebase Auth** with **FirebaseUI**.

**Features**: Email/password authentication, Google Sign-In, email verification, password reset, and session
persistence.

For detailed authentication setup, configuration, and usage instructions, see the 
**[Web App Authentication Documentation](./packages/web/README.md#authentication)**.

## Development

### Firebase Emulator (Recommended)

Start the Firebase emulator to run both web and API locally:

```bash
firebase emulators:start
```

Or use the project-level script:

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

## Project-level Scripts

Project-level scripts for convenience:

```bash
# Lint all packages
pnpm run lint

# Format all packages  
pnpm run format

# Format and lint all packages in sequence
pnpm run forlin

# Verify code quality across all packages (format check + lint)
pnpm run verify

# Build all packages
pnpm run build

# Build and test all packages
pnpm run test

# Build and start Firebase emulator with all services
pnpm run emulator
```

Note: Since packages are managed independently, you can also build each package separately by running commands within
each package directory.

## Testing

### Testing Philosophy

For detailed testing philosophy and approach, see the *
*[Testing Philosophy Documentation](docs/dev/contributing_guidelines.md#testing-requirements)**.

## Code Quality

### Package-Level Verification

Code quality must be verified for each package separately:

```bash
# Verify API package
cd packages/api && pnpm run lint && pnpm run format:check

# Verify web package
cd packages/web && pnpm run lint && pnpm run format:check

# Or use the convenience script from root
./scripts/verify-all.sh
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
./scripts/build-all.sh
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
- **Package Manager**: pnpm (defined in `packageManager` field in each package)
- **Firebase CLI**: Required for deployment and emulators
- **Package Management**: Each package is managed independently (no workspace configuration for Firebase Functions
  compatibility)
