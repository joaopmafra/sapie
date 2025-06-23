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

### Firebase Project Setup

- [ ] Create/verify demo projects for development environments
    - [ ] Create `demo-local` project for local development (minimal setup needed)
    - [ ] Create `demo-emulator` project for emulator development (minimal setup needed)
    - [ ] Create `demo-test-e2e` project for E2E testing (minimal setup needed)
- [ ] Create/verify real Firebase projects for deployed environments
    - [ ] Create `sapie-dev` project for development deployment
    - [ ] Create `sapie-staging` project for staging environment
    - [ ] Verify `sapie-prod` project exists and is properly configured
- [ ] Configure Firebase services for deployed environments
    - [ ] Enable Authentication (Email/Password, Google) for `sapie-dev`, `sapie-staging`, `sapie-prod`
    - [ ] Configure authorized domains for each deployed environment
    - [ ] Set up Firebase Hosting for `sapie-dev`, `sapie-staging`, `sapie-prod`
    - [ ] Configure Firebase Functions for `sapie-dev`, `sapie-staging`, `sapie-prod`
- [ ] Configure emulator settings for development environments
    - [ ] Ensure Firebase emulator configuration supports all demo projects
    - [ ] Configure emulator ports and settings for local and emulator environments
    - [ ] Test Auth emulator connectivity from local development servers

### Environment Configuration

- [ ] Update Firebase configuration files
    - [ ] Create/update `.firebaserc` with project aliases
    - [ ] Update `firebase.json` to support multiple environments
    - [ ] Create environment-specific Firebase configuration if needed
- [ ] Create environment files for web package
    - [ ] Create `.env.local.example` with all required variables
    - [ ] Create `.env.development` for Firebase emulator
    - [ ] Create `.env.staging` for staging environment
    - [ ] Create `.env.production` for production environment
    - [ ] Update `.gitignore` to exclude sensitive environment files
- [ ] Update web package configuration
    - [ ] Modify `vite.config.ts` to support environment-specific builds
    - [ ] Update Firebase configuration in `src/lib/firebase/config.ts` to use environment variables
    - [ ] Test environment variable loading in different modes

### Build Scripts and Automation

- [ ] Create environment-specific build and run scripts
    - [ ] Add `dev:local` script to run web/API locally with auth emulator connection
    - [ ] Add `dev:emulator` script to run everything on Firebase emulator (default)
    - [ ] Add `build:dev` script for development environment deployment
    - [ ] Add `build:staging` script for staging environment deployment
    - [ ] Add `build:prod` script for production environment deployment
    - [ ] Update existing emulator scripts to support multiple demo projects
- [ ] Create deployment scripts
    - [ ] Add `deploy:dev` script for development deployment
    - [ ] Add `deploy:staging` script for staging deployment
    - [ ] Add `deploy:prod` script for production deployment
    - [ ] Add environment validation before deployment
- [ ] Update workspace-level scripts
    - [ ] Update root `package.json` scripts to support all environment targets
    - [ ] Update `scripts/build-all.sh` to accept environment parameter
    - [ ] Create `scripts/deploy.sh` with environment support
    - [ ] Create `scripts/dev-local.sh` to start local development with auth emulator

### API Package Updates

- [ ] Update API environment configuration
    - [ ] Modify `firebase-admin.config.ts` to support local development with auth emulator
    - [ ] Add environment-specific Firebase project ID configuration for all environments
    - [ ] Configure API to connect to auth emulator when running locally
    - [ ] Update API documentation with hybrid local environment setup
- [ ] Update API build and run process
    - [ ] Modify `package.json` scripts to support local development mode
    - [ ] Update `firebase-functions.ts` to respect environment configuration
    - [ ] Add local development script that connects to auth emulator
    - [ ] Test API authentication with emulated auth in local environment

### Testing and Validation

- [ ] Update E2E testing configuration
    - [ ] Modify `packages/test-e2e/playwright.config.ts` to use `demo-test-e2e` project with emulator
    - [ ] Update test helpers to support emulator-based testing
    - [ ] Ensure E2E tests run in isolation using Firebase emulator
    - [ ] Configure E2E tests to clean up data between test runs
- [ ] Validate environment isolation
    - [ ] Test that emulator environments don't affect deployed environments
    - [ ] Verify that each deployed environment has isolated data and configuration
    - [ ] Test environment switching functionality between local, dev, staging, and production

### Documentation and DevOps

- [ ] Update project documentation
    - [ ] Create comprehensive environment setup guide
    - [ ] Update `README.md` with environment-specific instructions
    - [ ] Document environment variable requirements for each environment
    - [ ] Add troubleshooting guide for environment issues
- [ ] Update development workflows
    - [ ] Document environment switching procedures
    - [ ] Create development best practices guide
    - [ ] Update onboarding documentation for new developers

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
