# Sapie API

NestJS-based API backend for the Sapie knowledge management application.

## Architecture

- **Framework**: NestJS with TypeScript
- **Runtime**: Node.js 22
- **Deployment**: Firebase Functions
- **Testing**: Jest for unit tests and e2e tests
- **Package Management**: PNPM (defined in packageManager field)
- **Code Quality**: ESLint + Prettier integration

## Project Structure

```
packages/api/
├── src/
│   ├── health/              # Health check module
│   │   ├── health.controller.ts
│   │   ├── health.controller.spec.ts
│   │   └── health.module.ts
│   ├── app.controller.ts    # Main app controller
│   ├── app.module.ts        # Main app module
│   ├── firebase-functions.ts # Firebase Functions entry point
│   └── main.ts              # Local development entry point
├── test/                    # E2E tests
├── dist/                    # Build output
├── FIREBASE_ADMIN_SETUP.md  # Firebase Admin SDK setup guide
├── .prettierrc              # Prettier configuration
├── eslint.config.mjs        # ESLint configuration (with Prettier integration)
└── package.json             # Package configuration (@sapie/api)
```

## Development Environments

The API supports multiple development environments:

### 1. Full Emulator Environment (`pnpm run emulator`)
- Everything runs inside Firebase emulators
- Complete isolation from production
- Slower startup but maximum safety

### 2. Hybrid Local Development (`pnpm run dev:local`)
- **NEW**: API runs locally with hot reloading
- Firebase services run in emulators (Auth, Firestore)
- Fast development with emulated Firebase services
- Best of both worlds: speed + safety

### 3. Local Development (`pnpm run dev`)
- API runs locally
- Uses local environment configuration

## Quick Start - Local Development

1. **Copy environment template**:
   ```bash
   cp .env.local-dev.example .env.local-dev
   ```

2. **Start hybrid local development** (recommended):
   ```bash
   # From project root
   pnpm run dev:local
   
   # Or just the API
   cd packages/api
   pnpm run dev:local
   ```

3. **Access services**:
   - API: http://localhost:3000
   - API Swagger: http://localhost:3000/api/docs
   - Firebase Auth Emulator: http://localhost:9099
   - Firestore Emulator: http://localhost:8080

## Environment Configuration

The API uses environment files in this order:
1. `.env.${CURRENT_ENV}` (environment-specific)

### Local Development Variables

See `.env.local-dev.example` for all required variables:
- `CURRENT_ENV=local-dev`
- `NODE_ENV=development`
- `FUNCTIONS_EMULATOR=true`
- `GCLOUD_PROJECT=demo-local-dev`
- `PORT=3000`

## Development Setup

### Prerequisites

Install dependencies for this package:

```bash
cd packages/api
pnpm install
```

### Development Commands

```bash
# Start in development mode with hot reload
pnpm run dev

# Start in production mode
pnpm run start:prod

# Build for local development
pnpm run build

# Build for Firebase Functions
pnpm run build:firebase

# Run linting with auto-fix
pnpm run lint

# Run linting without fixes
pnpm run lint:check

# Format code
pnpm run format

# Check code formatting
pnpm run format:check
```

## API Endpoints

### Health Check

**GET** `/api/health`

Returns the API health status and current timestamp.

**Response:**

```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Testing the API:**

```bash
# Local development server
curl -X GET http://localhost:3000/api/health

# Firebase Emulator
curl -X GET http://127.0.0.1:5001/demo-emulator/us-central1/api/health

# Staging
curl -X GET https://sapie-b09be.web.app/api/health
```

## Testing

### Unit Tests

```bash
# Run all unit tests
pnpm test

# Run tests with coverage
pnpm test:cov

# Run tests in watch mode
pnpm test:watch
```

### End-to-End Tests

```bash
# Run e2e tests
pnpm test:e2e

# Run all tests (unit + e2e)
pnpm test:all
```

### Test Structure

- **Unit Tests**: Located alongside source files (`.spec.ts`)
- **E2E Tests**: Located in `test/` directory
- **Coverage**: Generated in `coverage/` directory

## Code Quality

### Linting and Formatting

The package uses ESLint with Prettier integration:

```bash
# Lint code with auto-fix
pnpm run lint

# Lint code without fixes (for CI)
pnpm run lint:check

# Format code with Prettier
pnpm run format

# Check code formatting (for CI)
pnpm run format:check
```

### Configuration Files

- **ESLint**: `eslint.config.mjs` with TypeScript and NestJS rules
- **Prettier**: `.prettierrc` with consistent formatting rules

## Firebase Integration

The API is configured to run on Firebase Functions using the Firebase Functions framework adapter.

### Configuration Files

- `firebase-functions.ts`: Entry point for Firebase Functions
- `package.json`: Configured with Firebase Functions dependencies
- `nest-cli.json`: NestJS CLI configuration

### Environment Variables

The API uses Firebase Functions environment for production deployment.

### Firebase Admin SDK

The API includes Firebase Admin SDK integration for server-side authentication and user management.

#### Configuration

The Firebase Admin SDK is automatically configured for different environments:

- **Production (Firebase Functions)**: Uses default credentials automatically
- **Development with Firebase Emulator**: Uses project ID configuration
- **Local Development**: Can use service account key file or default credentials

For detailed setup instructions, see [FIREBASE_ADMIN_SETUP.md](./FIREBASE_ADMIN_SETUP.md).

For comprehensive authentication documentation,
see [NestJS Firebase Integration Guide](../../docs/other/nestjs_firebase_integration.md).

#### Usage

```typescript
import {verifyIdToken, getUserByUid} from './config/firebase-admin.config';

// Verify Firebase ID token
const decodedToken = await verifyIdToken(idToken);

// Get user information
const user = await getUserByUid(decodedToken.uid);
```

## Development vs Production

### Local Development

- **Entry Point**: `main.ts`
- **Port**: 3000
- **Hot Reload**: Enabled with `--watch`

### Firebase Functions

- **Entry Point**: `firebase-functions.ts`
- **Runtime**: Node.js 22
- **CORS**: Enabled for cross-origin requests

## Build Process

### Local Development Build

```bash
pnpm run build
```

### Firebase Functions Build

```bash
pnpm run build:firebase
```

This command:

1. Runs the NestJS build process
2. Copies `package.json` to the `dist/` directory for Firebase Functions deployment

## Workspace Integration

This package is part of the Sapie PNPM workspace. From the workspace root:

```bash
# Run workspace-level verification (includes this package)
pnpm run verify

# Build all packages (includes this package)
pnpm run build

# Run all tests (includes this package)
pnpm run test
```

## Deployment

The API is automatically deployed to Firebase Functions when running:

```bash
# From project root
firebase deploy
```

Or deploy only functions:

```bash
firebase deploy --only functions
```

## Dependencies

### Production Dependencies

- `@nestjs/common`, `@nestjs/core`: NestJS framework
- `firebase-functions`: Firebase Functions runtime
- `firebase-admin`: Firebase Admin SDK
- `rxjs`: Reactive extensions

### Development Dependencies

- `@nestjs/testing`: Testing utilities
- `jest`: Testing framework
- `supertest`: HTTP testing
- `typescript`: TypeScript compiler
- `eslint`, `prettier`: Code quality tools
- `typescript-eslint`: TypeScript-specific ESLint rules

## Package Information

- **Package Name**: `@sapie/api`
- **Package Manager**: pnpm@10.12.1
- **Node.js Engine**: 22.x
- **Private Package**: Yes (not published to npm)

## Environment Requirements

- **Node.js**: 22.x (see `.nvmrc` in workspace root)
- **Package Manager**: pnpm@10.12.1 (defined in `packageManager` field)
- **Firebase CLI**: Required for deployment and emulators
