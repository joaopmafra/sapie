# Sapie API

NestJS-based API backend for the Sapie knowledge management application.

## Architecture

- **Framework**: NestJS with TypeScript
- **Runtime**: Node.js 22
- **Deployment**: Firebase Functions
- **Testing**: Jest for unit tests and e2e tests

## Project Structure

```
api/
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
└── package.json
```

## Development Setup

### Install Dependencies

```bash
cd api
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

**Example Usage:**
```bash
# Local development
curl -X GET http://localhost:3000/api/health

# Firebase Emulator
curl -X GET http://127.0.0.1:5001/sapie-b09be/us-central1/api/health

# Production
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

## Firebase Integration

The API is configured to run on Firebase Functions using the Firebase Functions framework adapter.

### Configuration Files

- `firebase-functions.ts`: Entry point for Firebase Functions
- `package.json`: Configured with Firebase Functions dependencies
- `nest-cli.json`: NestJS CLI configuration

### Environment Variables

The API uses Firebase Functions environment for production deployment.

## Development vs Production

### Local Development
- **Entry Point**: `main.ts`
- **Port**: 3000
- **Hot Reload**: Enabled with `--watch`

### Firebase Functions
- **Entry Point**: `firebase-functions.ts`
- **Runtime**: Node.js 22
- **CORS**: Enabled for cross-origin requests

## Code Quality

### Linting
```bash
pnpm run lint
```

### Formatting
```bash
pnpm run format
```

### Configuration
- **ESLint**: Configured with TypeScript rules
- **Prettier**: Code formatting
- **TypeScript**: Strict type checking enabled

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
