# Sapie Web App

React-based frontend for the Sapie knowledge management application.

## Architecture

- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite
- **UI Library**: Material-UI (MUI)
- **State Management**: React Hooks (useState, useEffect)
- **HTTP Client**: Fetch API
- **Deployment**: Firebase Hosting

## Project Structure

```
web/
├── src/
│   ├── App.tsx              # Main application component
│   ├── App.css              # Application styles
│   ├── main.tsx             # Application entry point
│   ├── index.css            # Global styles
│   └── assets/              # Static assets
├── public/                  # Public assets
├── dist/                    # Build output
├── vite.config.ts           # Vite configuration
└── package.json
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

```bash
cd web
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

# Run linting
pnpm run lint
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

### Linting
```bash
# Run ESLint
pnpm run lint

# ESLint with auto-fix
pnpm run lint -- --fix
```

### Type Checking
TypeScript type checking runs automatically during:
- Development (`pnpm run dev`)
- Build process (`pnpm run build`)
- IDE integration

## Environment Support

### Development
- **Node.js**: 22.x (see `.nvmrc`)
- **Package Manager**: pnpm
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

## Dependencies

### Production Dependencies
- `react`, `react-dom`: React framework
- `@mui/material`: Material-UI components
- `@mui/icons-material`: Material Design icons
- `@emotion/react`, `@emotion/styled`: CSS-in-JS styling

### Development Dependencies
- `@vitejs/plugin-react`: React integration for Vite
- `typescript`: TypeScript compiler
- `eslint`: Code linting
- `vite`: Build tool and development server
