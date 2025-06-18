# Sapie Web App

React-based frontend for the Sapie knowledge management application.

## Architecture

- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite
- **UI Library**: Material-UI (MUI)
- **State Management**: React Hooks (useState, useEffect)
- **HTTP Client**: Fetch API
- **Deployment**: Firebase Hosting
- **Package Management**: PNPM (defined in packageManager field)
- **Code Quality**: ESLint + Prettier integration

## Project Structure

```
packages/web/
├── src/
│   ├── App.tsx              # Main application component
│   ├── App.css              # Application styles
│   ├── main.tsx             # Application entry point
│   ├── index.css            # Global styles
│   └── assets/              # Static assets
├── public/                  # Public assets
├── dist/                    # Build output
├── .prettierrc              # Prettier configuration
├── .prettierignore          # Prettier ignore patterns
├── eslint.config.js         # ESLint configuration (with Prettier integration)
├── vite.config.ts           # Vite configuration
└── package.json             # Package configuration (@sapie/web)
```

## Features

### API Health Status Display
The web app demonstrates API connectivity by:
- Fetching health status from the `/api/health` endpoint
- Displaying the API response in real-time
- Showing connection status and error handling

### Modern React Stack
- **React 19**: Latest React features and performance improvements
- **TypeScript**: Full type safety and developer experience
- **Material-UI**: Modern, accessible component library
- **Vite**: Fast development server and optimized builds

## Development Setup

### Prerequisites

Install dependencies for this package:
```bash
cd packages/web
pnpm install
```

### Development Commands

```bash
# Start development server
pnpm dev

# Build and watch for changes for running in Firebase Emulator
pnpm dev:firebase

# Build for production
pnpm build

# Build for running in Firebase Emulator
pnpm build:firebase

# Preview production build
pnpm preview

# Lint and format
pnpm lint
pnpm format
```

## Development Server

The development server runs on `http://localhost:5173` with:
- **Hot Module Replacement (HMR)**: Instant updates during development
- **API Proxy**: Automatically proxies `/api/*` requests to `http://localhost:3000`
- **TypeScript**: Real-time type checking

### API Integration

The web app integrates with the Sapie API through:

1. **Development Proxy** (via Vite):
   ```typescript
   // vite.config.ts
   server: {
     proxy: {
       '/api': {
         target: 'http://localhost:3000',
         changeOrigin: true,
         secure: false
       }
     }
   }
   ```

2. **Health Check Integration**:
   ```typescript
   // App.tsx
   useEffect(() => {
     fetch('/api/health')
       .then(response => response.json())
       .then(data => setHealthStatus(JSON.stringify(data, null, 2)))
       .catch(() => setHealthStatus('Error fetching health status'))
   }, [])
   ```

## Components

### App Component (`src/App.tsx`)
The main application component featuring:
- API health status display
- Interactive counter demonstration
- Material-UI components showcase
- Responsive design with Container and Grid system

### Key Features:
- **Health Status**: Real-time API connectivity display
- **Counter**: Interactive state management example
- **Responsive Layout**: Mobile-first design approach
- **Error Handling**: Graceful API error display

## Styling

### Material-UI Integration
- **Theme**: Default Material-UI theme
- **Components**: Card, Typography, Button, Container, Box
- **Icons**: Material Icons integration
- **Responsive**: Built-in responsive breakpoints

### Custom Styles
- `App.css`: Component-specific styles
- `index.css`: Global styles and CSS reset

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
- **ESLint**: `eslint.config.js` with TypeScript and React rules
- **Prettier**: `.prettierrc` with consistent formatting rules
- **Prettier Ignore**: `.prettierignore` to exclude certain files

## Build Process

### Production Build
```bash
pnpm run build
```

Creates optimized production build in `dist/`:
- **Code Splitting**: Automatic chunk optimization
- **Asset Optimization**: Image and CSS minification
- **TypeScript Compilation**: Type checking and compilation
- **Tree Shaking**: Unused code elimination

### Build Output
- `dist/index.html`: Main HTML file
- `dist/assets/`: Optimized JavaScript, CSS, and images
- Compatible with Firebase Hosting

## Firebase Integration

### Development with Emulator
When running via Firebase emulator (`firebase emulators:start`):
- Web app served at `http://localhost:5000`
- API calls proxied through Firebase rewrites
- Full production-like environment locally

### Production Deployment
- Deployed to Firebase Hosting
- API calls routed to Firebase Functions
- Available at: https://sapie-b09be.web.app

## Environment Configuration

The web app uses environment variables to configure the API base URL for different environments:

### Environment Files

- `.env` - Default configuration (local development with localhost:3000)
- `.env.development` - Firebase Emulator configuration
- `.env.production` - Production configuration
- `.env.local` - Local overrides (gitignored)

### Environment Variables

- `VITE_API_BASE_URL` - Base URL for API calls

### Configuration Examples

**Local Development** (`.env`):
```
VITE_API_BASE_URL=http://localhost:3000
```

**Firebase Emulator** (`.env.development`):
```
VITE_API_BASE_URL=http://127.0.0.1:5000
```

### Usage in Development

Pass the API base URL when creating the API configuration:

```typescript
import { createApiConfiguration } from './lib/api-client';
const config = createApiConfiguration(import.meta.env.VITE_API_BASE_URL);
```

## API Client

This package uses a generated TypeScript API client based on the OpenAPI specification from the NestJS API.

### Generating the API Client

The API client is generated from the OpenAPI spec and should be regenerated whenever the API changes:

```bash
# Make sure the API server is running first
cd ../api && pnpm dev

# In another terminal, generate the client
cd ../web
pnpm generate:api-client
```

### Using the API Client

The generated client provides type-safe access to all API endpoints:

```typescript
import { HealthApi, AppApi, createApiConfiguration } from './lib/api-client';

// Create API instances
const config = createApiConfiguration();
const healthApi = new HealthApi(config);

// Use the APIs
const healthResponse = await healthApi.healthControllerGetHealth();
```

### Important Notes

- The `src/lib/api-client/` directory is auto-generated and should not be edited manually
- This directory is excluded from version control via `.gitignore`
- Regenerate the client after any API schema changes
- The client uses axios for HTTP requests and provides full TypeScript typing

## Technologies

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Material-UI** - Component library
- **Generated API Client** - Type-safe API communication
