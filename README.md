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
├── docs/             # Project documentation — see docs/README.md
├── firebase.json     # Firebase configuration
└── README.md         # This file
```

## Architecture

- **Frontend**: React 19 with TypeScript, Material-UI, and Vite
- **Backend**: NestJS API with TypeScript
- **Authentication**: Firebase Auth with FirebaseUI for login/logout flows
- **Deployment**: Firebase Hosting (web) + Firebase Functions (API)
- **Development**: Firebase Emulator Suite for local development
- **Package Management**: Each package managed independently with PNPM (see [Firebase and monorepo tooling](#firebase-and-monorepo-tooling))
- **Code Quality**: ESLint + Prettier integration across all packages
- **CI/CD Pipeline**: NOT IMPLEMENTED YET

## Environments

| Environment | Firebase Project | Web/API Runtime   | Firebase Services | Purpose                                   |
|-------------|------------------|-------------------|-------------------|-------------------------------------------|
| emulator    | `demo-emulator`  | Firebase Emulator | Auth emulator     | Full emulator development (default)       |
| test-e2e    | `demo-test-e2e`  | Firebase Emulator | Auth emulator     | Automated testing                         |
| local-dev   | `demo-local-dev` | Local servers     | Auth emulator     | Development with local servers + emulator |
| development | `sapie-dev`      | Firebase hosting  | Real Firebase     | Development deployment                    |
| staging     | `sapie-staging`  | Firebase hosting  | Real Firebase     | Pre-production validation                 |
| production  | `sapie-prod`     | Firebase hosting  | Real Firebase     | Live application                          |

## Development Principles

Sapie follows core development principles to maintain code quality and consistency.

For how we work (MVP goal, principles, contributing), see **[Developer documentation](docs/dev/README.md)** and
**[Development principles](docs/dev/development_principles.md)**.

## Firebase and monorepo tooling

Firebase’s **Hosting** and **Cloud Functions** workflows (CLI, emulators, and deploy) assume dependencies can be
resolved in a **classic layout** next to the built function code (for Sapie: under `packages/api/`). Tooling does
**not** reliably support a **root-level PNPM/Yarn/npm workspace** with a **single root lockfile** and symlinked or
virtual-store `node_modules` the way typical monorepos do. Similar limitations apply to other workspace-centric
layouts: the Functions runtime and packaging step are not first-class monorepo citizens.

**Implication for Sapie:** packages are installed **independently** (each package has its own `pnpm install` and
lockfile where needed) so the API build output and `node_modules` stay predictable for emulators and deploy. Do not
introduce a root-only PNPM workspace + single `pnpm-lock.yaml` for the whole repo expecting Firebase to “just work”
without a dedicated bundling or deploy workaround.

For emulator stacks in Docker (including prod-like deps for the Functions emulator), see
**[firebase_emulators_docker_plan.md](docs/plans/firebase_emulators_docker_plan.md)**.

## Quick Start

### Prerequisites

- **Node.js**: 22.x (see `.nvmrc` and `.npmrc`)
- **Package Manager**: [pnpm](https://pnpm.io/installation) (required)
- **Docker** and Docker Compose v2: required for **`pnpm run emulator`** (full Hosting + Functions emulator in Compose)
- **Firebase CLI**: required for **deployment**; optional if you only use Compose-based emulators

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

# Build for `emulator` and start full Firebase emulator stack (Docker Compose)
pnpm run emulator
```

Uses [`scripts/build-run-on-emulator.sh`](scripts/build-run-on-emulator.sh) (`compose.emulator.yml`). This provides:

- **Web App**: http://localhost:5000
- **API**: http://localhost:5001/demo-emulator/us-central1/api
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

### Firebase Emulator (full stack, recommended)

Run the full emulator (Hosting + Functions + Auth + Firestore) via Docker:

```bash
pnpm run emulator
```

Advanced: from the repo root, after `scripts/build-all.sh emulator`, you can run **`firebase emulators:start --project emulator`** on the host if you prefer not to use Compose (you must have Firebase CLI and compatible `node_modules` for Functions).

### E2E tests (Playwright + Compose)

Playwright targets the same Hosting + Functions emulator model as the full stack above, but with the **`test-e2e`** Firebase alias (emulated project id **`demo-test-e2e`**). From the repo root:

```bash
scripts/build-all.sh test-e2e
docker compose -f compose.test-e2e.yml up --build -d --wait
cd packages/test-e2e && pnpm test
```

Uses [`compose.test-e2e.yml`](compose.test-e2e.yml). **Do not** run this alongside `pnpm run emulator` — the published ports overlap. Full steps: **[packages/test-e2e/README.md](./packages/test-e2e/README.md)**.

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

For testing expectations (API vs web vs E2E), see **[Contributing guidelines](docs/dev/contributing_guidelines.md#testing-expectations)**.

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

Deploy the complete application to Firebase (staging):

```bash
firebase deploy --project=sapie-b09be
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

## Firebase Commands

```bash
# Kill Firebase emulators
pkill -f "firebase.*emulator"

# Start Firebase with all emulators enabled
firebase emulators:start

# Start Firebase with only some emulators enabled
firebase emulators:start --only=auth,functions,firestore

# Clear the current project
firebase use --clear
```

## Environment Requirements

- **Node.js**: 22.x (see `.nvmrc`)
- **Package Manager**: pnpm (see `packageManager` in root and package `package.json` files)
- **Docker + Compose**: Required for **`pnpm run emulator`**
- **Firebase CLI**: Required for deployment; optional for local emulator if using Compose only
- **Layout**: Independent installs per package — required for Firebase; see [Firebase and monorepo tooling](#firebase-and-monorepo-tooling)
