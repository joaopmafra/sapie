# Setup multiple environments

## Description

As a developer, I want to have multiple environments properly configured for the project so that I can develop, test, and deploy the application safely through different stages of the development lifecycle.

The project needs to support these environments:

- **local** - Local development with web/API running locally, connecting to Firebase Auth emulator
- **emulator** - Local development with all services running on Firebase Emulator (default for safety)
- **test-e2e** - End-to-end testing using Firebase Emulator
- **development** - Development deployment on Firebase hosting
- **staging** - Pre-production testing on Firebase hosting  
- **production** - Production deployment on Firebase hosting

| Environment | Firebase Project | Web/API Runtime   | Firebase Services | Purpose                                        |
|-------------|------------------|-------------------|-------------------|------------------------------------------------|
| local       | `demo-local`     | Local servers     | Auth emulator     | Development with local servers + emulated auth |
| emulator    | `demo-emulator`  | Firebase Emulator | Auth emulator     | Full emulator development                      |
| test-e2e    | `demo-test-e2e`  | Firebase Emulator | Auth emulator     | Automated testing                              |
| development | `sapie-dev`      | Firebase hosting  | Real Firebase     | Development deployment                         |
| staging     | `sapie-staging`  | Firebase hosting  | Real Firebase     | Pre-production validation                      |
| production  | `sapie-prod`     | Firebase hosting  | Real Firebase     | Live application                               |

The default environment should be **emulator** for local development to avoid accidental production data usage.

## Technical Requirements

- Demo projects (`demo-local`, `demo-emulator`, `demo-test-e2e`) for safe development
- Real Firebase projects (`sapie-dev`, `sapie-staging`, `sapie-prod`) for deployments
- Local environment: web/API run locally but connect to Firebase Auth emulator
- Emulator environment: all services run on Firebase emulator (default for safety)
- Environment-specific configuration managed through environment files and build scripts
- API and web packages should detect and connect to appropriate Firebase services per environment

## Tasks

### Phase 1: Emulator Environment (Default Development)

**Goal**: Establish the default development environment using Firebase emulator for all services.

- [ ] **Firebase Project Setup for Emulator**
    - [ ] Create `demo-emulator` project (minimal setup needed)
    - [ ] Configure Firebase emulator settings for `demo-emulator` project
    - [ ] Update `.firebaserc` with `emulator` alias pointing to `demo-emulator`
- [ ] **Environment Configuration**
    - [ ] Create `.env.development` for emulator environment
    - [ ] Update `firebase.json` to support emulator configuration
    - [ ] Modify Firebase configuration in `src/lib/firebase/config.ts` to detect emulator mode
- [ ] **Build Scripts and API Updates**
    - [ ] Add `dev:emulator` script to run everything on Firebase emulator (make this default)
    - [ ] Update API `firebase-admin.config.ts` to support emulator mode
    - [ ] Modify API `package.json` scripts to support emulator development
- [ ] **Testing and Validation**
    - [ ] Test web app authentication with emulated auth
    - [ ] Test API connectivity with emulated services
    - [ ] Verify data isolation (emulator data doesn't affect other environments)
    - [ ] Update project documentation for emulator environment usage

### Phase 2: Test-E2E Environment

**Goal**: Configure isolated testing environment for automated E2E tests.

- [ ] **Firebase Project Setup for Test-E2E**
    - [ ] Create `demo-test-e2e` project (minimal setup needed)
    - [ ] Configure emulator settings specifically for E2E testing
    - [ ] Update `.firebaserc` with `test-e2e` alias pointing to `demo-test-e2e`
- [ ] **E2E Testing Configuration**
    - [ ] Modify `packages/test-e2e/playwright.config.ts` to use `demo-test-e2e` project
    - [ ] Update test helpers to support emulator-based testing with `test-e2e` environment
    - [ ] Configure E2E tests to use separate emulator ports if needed
- [ ] **Build Scripts for Testing**
    - [ ] Add `test:e2e:emulator` script that starts emulator with test-e2e configuration
    - [ ] Ensure E2E tests clean up data between test runs
    - [ ] Add environment validation for test environment
- [ ] **Testing and Validation**
    - [ ] Run E2E tests in isolated test-e2e environment
    - [ ] Verify test environment doesn't affect emulator or other environments
    - [ ] Test parallel execution of emulator and test-e2e environments

### Phase 3: Local Environment (Hybrid Local Development)

**Goal**: Enable hybrid local development where web/API run locally but connect to Firebase Auth emulator.

- [ ] **Firebase Project Setup for Local**
    - [ ] Create `demo-local` project (minimal setup needed)
    - [ ] Configure auth emulator settings for local development
    - [ ] Update `.firebaserc` with `local` alias pointing to `demo-local`
- [ ] **Environment Configuration**
    - [ ] Create `.env.local.example` with all required variables
    - [ ] Create local environment configuration files
    - [ ] Update `vite.config.ts` to support local development mode
- [ ] **Build Scripts and API Updates**
    - [ ] Add `dev:local` script to run web/API locally with auth emulator connection
    - [ ] Create `scripts/dev-local.sh` to start local development with auth emulator
    - [ ] Modify API to connect to auth emulator when running locally
    - [ ] Update API documentation with hybrid local environment setup
- [ ] **Testing and Validation**
    - [ ] Test local web/API servers connecting to auth emulator
    - [ ] Verify authentication flow in local development mode
    - [ ] Test hot reloading and development workflow
    - [ ] Document local development setup and troubleshooting

### Phase 4: Development Environment (First Real Deployment)

**Goal**: Set up development deployment environment using real Firebase services.

- [ ] **Firebase Project Setup for Development**
    - [ ] Create `sapie-dev` project for development deployment
    - [ ] Enable Authentication (Email/Password, Google) for `sapie-dev`
    - [ ] Configure authorized domains for development environment
    - [ ] Set up Firebase Hosting for `sapie-dev`
    - [ ] Configure Firebase Functions for `sapie-dev`
- [ ] **Environment Configuration**
    - [ ] Create environment-specific Firebase configuration for development
    - [ ] Update `.firebaserc` with `dev` alias pointing to `sapie-dev`
    - [ ] Create development environment variables and configuration
- [ ] **Build Scripts and Deployment**
    - [ ] Add `build:dev` script for development environment deployment
    - [ ] Add `deploy:dev` script for development deployment
    - [ ] Update `firebase.json` to support development environment deployment
    - [ ] Add environment validation before development deployment
- [ ] **Testing and Validation**
    - [ ] Test deployment to development environment
    - [ ] Verify authentication works with real Firebase Auth in dev environment
    - [ ] Test API functionality in deployed development environment
    - [ ] Validate environment isolation (dev data separate from other environments)

### Phase 5: Staging Environment

**Goal**: Set up pre-production testing environment.

- [ ] **Firebase Project Setup for Staging**
    - [ ] Create `sapie-staging` project for staging environment
    - [ ] Enable Authentication (Email/Password, Google) for `sapie-staging`
    - [ ] Configure authorized domains for staging environment
    - [ ] Set up Firebase Hosting for `sapie-staging`
    - [ ] Configure Firebase Functions for `sapie-staging`
- [ ] **Environment Configuration**
    - [ ] Create `.env.staging` for staging environment
    - [ ] Update Firebase configuration for staging
    - [ ] Update `.firebaserc` with `staging` alias pointing to `sapie-staging`
- [ ] **Build Scripts and Deployment**
    - [ ] Add `build:staging` script for staging environment deployment
    - [ ] Add `deploy:staging` script for staging deployment
    - [ ] Add staging-specific deployment validation
- [ ] **Testing and Validation**
    - [ ] Test deployment to staging environment
    - [ ] Run comprehensive testing in staging environment
    - [ ] Verify production-like functionality in staging
    - [ ] Document staging environment usage and testing procedures

### Phase 6: Production Environment

**Goal**: Finalize production environment configuration and deployment.

- [ ] **Firebase Project Setup for Production**
    - [ ] Verify `sapie-prod` project exists and is properly configured
    - [ ] Enable Authentication (Email/Password, Google) for `sapie-prod`
    - [ ] Configure authorized domains for production environment
    - [ ] Set up Firebase Hosting for `sapie-prod`
    - [ ] Configure Firebase Functions for `sapie-prod`
- [ ] **Environment Configuration**
    - [ ] Create `.env.production` for production environment
    - [ ] Update Firebase configuration for production
    - [ ] Update `.firebaserc` with `prod` alias pointing to `sapie-prod`
    - [ ] Ensure secure configuration (no sensitive data in version control)
- [ ] **Build Scripts and Deployment**
    - [ ] Add `build:prod` script for production environment deployment
    - [ ] Add `deploy:prod` script for production deployment
    - [ ] Add comprehensive environment validation before production deployment
    - [ ] Add production deployment safety checks
- [ ] **Testing and Validation**
    - [ ] Test deployment to production environment
    - [ ] Verify all functionality in production environment
    - [ ] Test production monitoring and error handling
    - [ ] Document production deployment and rollback procedures

### Phase 7: Final Integration and Documentation

**Goal**: Complete workspace-level integration and comprehensive documentation.

- [ ] **Workspace Integration**
    - [ ] Update root `package.json` scripts to support all environment targets
    - [ ] Update `scripts/build-all.sh` to accept environment parameter
    - [ ] Create `scripts/deploy.sh` with environment support
    - [ ] Update existing emulator scripts to support multiple demo projects
- [ ] **Comprehensive Documentation**
    - [ ] Create comprehensive environment setup guide
    - [ ] Update `README.md` with environment-specific instructions
    - [ ] Document environment variable requirements for each environment
    - [ ] Add troubleshooting guide for environment issues
    - [ ] Document environment switching procedures
    - [ ] Create development best practices guide
    - [ ] Update onboarding documentation for new developers
- [ ] **Final Validation**
    - [ ] Test environment switching functionality between all environments
    - [ ] Verify that emulator environments don't affect deployed environments
    - [ ] Test all build and deployment scripts
    - [ ] Validate security and isolation across all environments
    - [ ] Monitor Firebase quotas and billing for real projects

## Acceptance Criteria

- [ ] All six environments are properly configured with appropriate Firebase projects/emulators
- [ ] Developers can easily switch between environments using build scripts
- [ ] Environment variables are properly configured for each environment
- [ ] Local development defaults to Firebase emulator for safety
- [ ] Each deployed environment (local, dev, staging, production) has working authentication and API connectivity
- [ ] Emulator environments (emulator, test-e2e) work independently without affecting deployed environments
- [ ] Build and deployment scripts work correctly for each target environment
- [ ] E2E tests run in isolated emulator environment without affecting other environments
- [ ] Documentation is complete and accurate for environment setup
- [ ] Environment configuration is secure (no sensitive data in version control)
- [ ] All environments are tested and validated before marking story as complete

## Dependencies

- Firebase projects must be created and configured before implementation
- Team access to Firebase Console for all environments
- Understanding of current Firebase configuration and build processes

## Notes

- Each phase builds upon the previous phases and can be implemented incrementally
- Local environment provides hybrid approach: local development with emulated authentication
- Emulator environment provides full isolation with all services emulated
- Demo projects require minimal Firebase configuration (mainly for project ID references)
- Consider using Firebase CLI aliases for easier environment management
- Ensure proper IAM permissions are set up for deployed environments
- Monitor Firebase quotas and billing for real projects (dev, staging, production)
- Consider implementing environment validation checks in CI/CD pipeline
- Document rollback procedures for each deployed environment

## Definition of Done

- [ ] All tasks completed and tested
- [ ] Code review completed
- [ ] Documentation updated and reviewed
- [ ] E2E tests passing in test environment
- [ ] All environments validated and working
- [ ] Story acceptance criteria met
