# Story 38: Setup Emulator Environment (Default Development)

## Description

As a developer, I want to establish the default development environment using Firebase emulator for all services so that I can develop safely without affecting production data and have a consistent development experience.

**Goal**: Establish the default development environment using Firebase emulator for all services.

This is the first phase of the multi-environment setup and provides the foundation for safe local development.

## User Story

```
As a developer
I want to use Firebase emulator as the default development environment
So that I can develop safely without accidentally affecting production data
And have a consistent, isolated development experience
```

## Business Value

- **Safety**: Developers can't accidentally modify production data during development
- **Consistency**: All developers work in identical emulated environments
- **Speed**: Fast startup and reset capabilities for development workflows
- **Cost**: No Firebase usage costs during development

## Technical Requirements

- Firebase emulator should be the default development environment
- All services (Auth, Firestore, Functions, Storage) should run in emulator
- Environment should be easily configurable and reset-able
- Web and API packages should automatically connect to emulator services
- Clear documentation for emulator environment usage

## Tasks

### Firebase Project Setup for Emulator

- [ ] Create `demo-emulator` project (minimal setup needed)
- [ ] Configure Firebase emulator settings for `demo-emulator` project  
- [ ] Update `.firebaserc` with `emulator` alias pointing to `demo-emulator`
- [ ] Verify emulator configuration supports all required services (Auth, Firestore, Functions, Storage)

### Environment Configuration

- [ ] Create `.env.development` for emulator environment with all required variables
- [ ] Update `firebase.json` to support emulator configuration
- [ ] Modify Firebase configuration in `src/lib/firebase/config.ts` to detect emulator mode
- [ ] Ensure environment variables are properly loaded in emulator mode

### Build Scripts and API Updates

- [ ] Add `dev:emulator` script to run everything on Firebase emulator (make this default)
- [ ] Update API `firebase-admin.config.ts` to support emulator mode
- [ ] Modify API `package.json` scripts to support emulator development
- [ ] Update workspace-level scripts to default to emulator environment

### Testing and Validation

- [ ] Test web app authentication with emulated auth
- [ ] Test API connectivity with emulated services
- [ ] Verify data isolation (emulator data doesn't affect other environments)
- [ ] Test content creation and management in emulator environment
- [ ] Update project documentation for emulator environment usage

## Acceptance Criteria

- [ ] Firebase emulator runs all required services (Auth, Firestore, Functions, Storage)
- [ ] Web application connects to emulated Firebase services by default
- [ ] API connects to emulated Firebase services by default
- [ ] Authentication flow works completely in emulator environment
- [ ] Content management (CRUD operations) works in emulator environment
- [ ] Emulator environment can be easily reset and cleaned
- [ ] Development workflow is faster than previous setup
- [ ] Documentation explains how to use emulator environment
- [ ] No production services are touched during emulator development

## Dependencies

- **Feature 5**: Multiple Environments Setup (parent feature)
- Understanding of current Firebase configuration
- Access to Firebase CLI
- Basic knowledge of Firebase emulator suite

## Notes

- This becomes the default development environment for safety
- Emulator environment provides full isolation with all services emulated
- Demo project requires minimal Firebase configuration (mainly for project ID references)
- Environment should be easily reset for testing purposes
- Consider using Firebase CLI aliases for easier environment management

## Definition of Done

- [ ] All tasks completed and tested
- [ ] Code review completed
- [ ] Documentation updated and reviewed
- [ ] Emulator environment fully functional and validated
- [ ] Story acceptance criteria met
- [ ] Environment serves as foundation for subsequent environment stories 