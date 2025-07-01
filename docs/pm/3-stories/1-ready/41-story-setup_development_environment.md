# Story 41: Setup Development Environment (First Real Deployment)

## Description

As a developer, I want to set up a development deployment environment using real Firebase services so that I can test the application in a production-like environment and validate deployments before staging.

**Goal**: Set up development deployment environment using real Firebase services.

This is the fourth phase of the multi-environment setup and represents the first real Firebase deployment environment.

## User Story

```
As a developer
I want a development deployment environment with real Firebase services
So that I can test deployments and validate functionality
In a production-like environment separate from production
```

## Business Value

- **Deployment Validation**: Test deployment processes before staging/production
- **Production-like Testing**: Validate functionality with real Firebase services
- **Integration Testing**: Test with real authentication, hosting, and functions
- **Risk Reduction**: Catch deployment issues early in development cycle

## Technical Requirements

- Real Firebase project for development deployments
- All Firebase services enabled (Auth, Firestore, Functions, Hosting, Storage)
- Deployment scripts and build processes
- Environment-specific configuration management
- Proper security and access controls

## Tasks

### Firebase Project Setup for Development

- [ ] Create `sapie-dev` project for development deployment
- [ ] Enable Authentication (Email/Password, Google) for `sapie-dev`
- [ ] Configure authorized domains for development environment
- [ ] Set up Firebase Hosting for `sapie-dev`
- [ ] Configure Firebase Functions for `sapie-dev`
- [ ] Set up Firestore database for `sapie-dev`
- [ ] Configure Firebase Storage for `sapie-dev`

### Environment Configuration

- [ ] Create environment-specific Firebase configuration for development
- [ ] Update `.firebaserc` with `dev` alias pointing to `sapie-dev`
- [ ] Create development environment variables and configuration
- [ ] Update web app to use development Firebase configuration
- [ ] Configure API to use development Firebase project

### Build Scripts and Deployment

- [ ] Add `build:dev` script for development environment deployment
- [ ] Add `deploy:dev` script for development deployment
- [ ] Update `firebase.json` to support development environment deployment
- [ ] Add environment validation before development deployment
- [ ] Create deployment workflow documentation

### Testing and Validation

- [ ] Test deployment to development environment
- [ ] Verify authentication works with real Firebase Auth in dev environment
- [ ] Test API functionality in deployed development environment
- [ ] Validate environment isolation (dev data separate from other environments)
- [ ] Test content management in deployed development environment

## Acceptance Criteria

- [ ] `sapie-dev` Firebase project is created and configured
- [ ] All Firebase services are enabled and working
- [ ] Web application deploys successfully to Firebase Hosting
- [ ] API deploys successfully as Firebase Functions
- [ ] Authentication works with real Firebase Auth
- [ ] Content management (CRUD) works in deployed environment
- [ ] Environment is completely isolated from emulator and test environments
- [ ] Deployment scripts work reliably and can be repeated
- [ ] Environment has proper security configuration
- [ ] Development environment serves as template for staging and production

## Dependencies

- **Feature 5**: Multiple Environments Setup (parent feature)
- **Story 38**: Emulator environment for comparison and fallback
- Access to Firebase Console for project creation
- Understanding of Firebase deployment processes
- Team Firebase account with appropriate permissions

## Notes

- This is the first real Firebase environment after emulator/test environments
- Environment should mirror production configuration but with development data
- Consider implementing environment validation checks
- Document any differences from production configuration
- Monitor Firebase quotas and billing for development usage

## Definition of Done

- [ ] All tasks completed and tested
- [ ] Code review completed
- [ ] Documentation updated and reviewed
- [ ] Development environment fully deployed and functional
- [ ] Story acceptance criteria met
- [ ] Environment serves as foundation for staging and production setups 