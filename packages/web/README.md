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

### Install Dependencies

From the workspace root:
```bash
# Install all dependencies for all packages
pnpm install
```

Or for this package specifically:
```bash
cd packages/web
pnpm install
```

### Development Commands

```bash
# Start development server
pnpm run dev

# Build for production
pnpm run build

# Preview production build
pnpm run preview

# Run linting with auto-fix
pnpm run lint

# Run linting without fixes
pnpm run lint:check

# Format code
pnpm run format

# Check code formatting
pnpm run format:check
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
- Full production-like environment

### Production Deployment
Deployed to Firebase Hosting with:
- **Custom Domain**: https://sapie-b09be.web.app
- **API Rewrites**: `/api/*` routes to Firebase Functions
- **SPA Support**: All routes serve `index.html`

## Testing

### Linting and Formatting
```bash
# Run ESLint with auto-fix
pnpm run lint

# Check ESLint without fixes
pnpm run lint:check

# Format code
pnpm run format

# Check formatting
pnpm run format:check
```

### Type Checking
TypeScript type checking runs automatically during:
- Development (`pnpm run dev`)
- Build process (`pnpm run build`)
- IDE integration

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

## Environment Support

### Development
- **Node.js**: 22.x (see `.nvmrc`)
- **Package Manager**: pnpm@10.12.1 (defined in `packageManager` field)
- **Modern Browsers**: Chrome, Firefox, Safari, Edge

### Production
- **Firebase Hosting**: Static file serving
- **CDN**: Global content delivery
- **HTTPS**: Automatic SSL certificates

## Configuration

### Vite Configuration (`vite.config.ts`)
- React plugin integration
- Development server proxy setup
- Build optimization settings

### TypeScript Configuration
- `tsconfig.json`: Base TypeScript configuration
- `tsconfig.app.json`: App-specific settings
- `tsconfig.node.json`: Node.js environment settings

### Code Quality Configuration
- `eslint.config.js`: ESLint with TypeScript, React, and Prettier integration
- `.prettierrc`: Prettier formatting rules
- `.prettierignore`: Files excluded from formatting

## Dependencies

### Production Dependencies
- `react`, `react-dom`: React framework
- `@mui/material`: Material-UI components
- `@mui/icons-material`: Material Design icons
- `@emotion/react`, `@emotion/styled`: CSS-in-JS styling

### Development Dependencies
- `@vitejs/plugin-react`: React integration for Vite
- `typescript`: TypeScript compiler
- `eslint`: Code linting with comprehensive plugins
- `prettier`: Code formatting
- `vite`: Build tool and development server

## Package Information

- **Package Name**: `@sapie/web`
- **Package Manager**: pnpm@10.12.1
- **Node.js Engine**: 22.x
- **Private Package**: Yes (not published to npm)
