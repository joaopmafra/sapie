# Add api client generated by open api generator

## Overview
Establish type-safe communication between the NestJS API and React web client 
by implementing Swagger documentation and generating a TypeScript API client 
directly in the web app. This approach is compatible with Firebase Functions 
deployment and will improve developer experience, reduce runtime errors, and 
ensure API contract compliance.

## Tasks

### Core Implementation
 - [x] **Add swagger to the api package**
   - [x] Install `@nestjs/swagger` package
   - [x] Configure Swagger module in `app.module.ts`
   - [x] Add API documentation decorators to controllers and DTOs
   - [x] Ensure swagger is available only in dev mode or firebase emulator
   - [x] Disable swagger completely in production environment
   - [x] Set up swagger UI endpoint (e.g., `/api/docs`)

 - [x] **Set up API client generation in web package**
   - [x] Install `@openapitools/openapi-generator-cli` as dev dependency in web package
   - [x] Create generation script in root `scripts/` directory
   - [x] Configure OpenAPI generator to use TypeScript-axios template
   - [x] Generate client directly into `packages/web/src/lib/api-client/` directory
   - [x] Add npm script to web package for client generation
   - [x] Set up proper output directory structure within web package

 - [x] **Configure git to ignore generated client**
   - [x] Add `packages/web/src/lib/api-client/` to `.gitignore`
   - [x] Ensure generated client code is excluded from version control
   - [x] Document that client should be regenerated after API changes

 - [x] **Update web package to use generated client**
   - [x] Install axios dependency in web package for generated client
   - [x] Replace manual API calls with generated client methods
   - [x] Add proper error handling and loading states
   - [x] Update existing components to use typed API responses

### Development Workflow & Quality Assurance
 - [x] **Add validation and testing**
   - [x] Create tests to validate generated client matches API contracts
   - [x] Add type checking for API responses in web package
   - [x] Set up basic integration tests using generated client

 - [x] **Documentation and developer experience**
   - [x] Document client regeneration process in README
   - [x] Add npm scripts for easy client regeneration
   - [x] Create developer guidelines for API changes and client updates
   - [x] Add comments explaining when to regenerate client

## E2E Tests
 - [x] After adding the generated api client, the Playwright `page.route` stopped working for mocking API calls

### Implementation Details

**Swagger Configuration:**
- Environment: Development and Firebase emulator only
- Endpoint: `/api/docs`
- Security: Completely disabled in production

**Generated Client:**
- Language: TypeScript
- HTTP Client: Axios
- Location: `packages/web/src/lib/api-client/` (generated, not versioned)
- Output format: ES modules with TypeScript definitions
- Git: Excluded from version control via `.gitignore`

**Integration Points:**
- Web package imports from local `./lib/api-client`
- Client regenerated after API changes during development
- Shared types between API and client through generated code
- Error handling with proper TypeScript types

**Firebase Functions Compatibility:**
- No workspace dependencies to avoid Firebase Functions deployment issues
- Self-contained generation within each consuming application
- Independent package management per application
