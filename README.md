# Sapie

Sapie is a knowledge management app built with React (web frontend) and NestJS (API backend), deployed on Firebase.

## Project Structure

```
sapie/
├── web/          # React web application (Vite + TypeScript)
├── api/          # NestJS API backend
├── docs/         # Project documentation
├── firebase.json # Firebase configuration
└── README.md     # This file
```

## Architecture

- **Frontend**: React 19 with TypeScript, Material-UI, and Vite
- **Backend**: NestJS API with TypeScript
- **Deployment**: Firebase Hosting (web) + Firebase Functions (API)
- **Development**: Firebase Emulator Suite for local development

## Setup

### Prerequisites

[Install pnpm globally](https://pnpm.io/installation)

Install NestJS CLI globally:
```bash
pnpm add -g @nestjs/cli
```

### Install Dependencies

```bash
# Install API dependencies
cd api && pnpm install

# Install web dependencies
cd ../web && pnpm install
```

## Development

### Firebase Emulator

Start the Firebase emulator to run both web and API locally:
```bash
firebase emulators:start
```

The emulator will start and provide you with:
- **Web App**: http://localhost:5000
- **API**: http://localhost:5001/sapie-b09be/us-central1/api
- **Emulator UI**: http://localhost:4000

### Development Servers (Alternative)

For faster development, you can run the services separately:

```bash
# Terminal 1: Start API in development mode
cd api && pnpm run dev

# Terminal 2: Start web app in development mode  
cd web && pnpm run dev
```

This will start:
- **API**: http://localhost:3000
- **Web App**: http://localhost:5173 (with API proxy configured)

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

### API Tests
```bash
cd api

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
cd web

# Run linting
pnpm lint
```

## Deployment

### Firebase Hosting

Deploy the complete application to Firebase:

```bash
firebase deploy
```

This will:
1. Build the web app (`web/dist`)
2. Build the API for Firebase Functions (`api/dist`)
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

# Build web app
cd web && pnpm run build

# Build API for Firebase
cd api && pnpm run build:firebase

# Format code
cd api && pnpm run format
cd web && pnpm run lint
```

## Environment Requirements

- **Node.js**: 22.x (see `.nvmrc`)
- **Package Manager**: pnpm
- **Firebase CLI**: Required for deployment and emulators
