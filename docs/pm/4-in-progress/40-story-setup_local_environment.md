# Story 40: Setup Local Environment (Hybrid Local Development)

## Description

As a developer, I want to enable hybrid local development where web/API run locally but connect to all Firebase
emulators so that I can have fast local development with hot reloading while still using all emulated Firebase services.

**Goal**: Enable hybrid local development where web/API run locally but connect to all Firebase emulators (Auth,
Firestore, etc.).

This is the third phase of the multi-environment setup and provides an alternative development mode for developers who
prefer local servers.

## User Story

```
As a developer
I want to run web and API locally with all emulated Firebase services
So that I can benefit from fast local development and hot reloading
While still maintaining safe development practices with all emulated services
```

## Business Value

- **Development Speed**: Faster hot reloading and development iteration
- **Resource Efficiency**: Lower resource usage compared to full emulator
- **Flexibility**: Developers can choose between full emulator or hybrid local
- **Safety**: Still uses emulated auth to prevent production accidents

## Technical Requirements

- Web and API packages run locally (not in emulator)
- All Firebase services connect to Firebase emulators (Auth, Firestore, etc.)
- Hybrid configuration that combines local servers with emulated Firebase services
- Easy switching between local and emulator modes
- Proper environment variable configuration for hybrid mode

## Tasks

### Firebase Project Setup for Local

- [ ] Create `demo-local-dev` project (minimal setup needed)
- [ ] Configure all Firebase emulator settings for local development
- [ ] Update `.firebaserc` with `local-dev` alias pointing to `demo-local-dev`
- [ ] Configure Firebase emulators to accept connections from local servers

### Environment Configuration

- [ ] Create `.env.local.example` with all required variables
- [ ] Create local environment configuration files
- [ ] Update `vite.config.ts` to support local development mode with all emulated Firebase services
- [ ] Configure environment variables for hybrid local/emulated setup

### Build Scripts and API Updates

- [ ] Add `dev:local` script to run web/API locally with Firebase emulator connections
- [ ] Create `scripts/dev-local.sh` to start local development with Firebase emulators
- [ ] Modify API to connect to all Firebase emulators when running locally
- [ ] Update API documentation with hybrid local environment setup
- [ ] Ensure hot reloading works correctly in local mode

### Testing and Validation

- [ ] Test local web/API servers connecting to all Firebase emulators
- [ ] Verify authentication flow in local development mode
- [ ] Test hot reloading and development workflow
- [ ] Validate content management operations in local environment
- [ ] Document local development setup and troubleshooting

## Acceptance Criteria

- [ ] Web application runs locally with Vite dev server
- [ ] API runs locally with NestJS dev server
- [ ] Both local servers connect to all Firebase emulators (Auth, Firestore, etc.)
- [ ] Authentication flow works with local servers and emulated Firebase services
- [ ] Hot reloading works for both web and API development
- [ ] Content CRUD operations work in local environment with emulated Firestore
- [ ] Local environment doesn't affect emulator or test environments
- [ ] Environment switching between local and emulator is easy
- [ ] Local development is noticeably faster than full emulator
- [ ] Configuration is clearly documented with examples

## Dependencies

- **Feature 5**: Multiple Environments Setup (parent feature)
- **Story 38**: Emulator environment must be working for all Firebase emulators
- Understanding of Vite and NestJS development servers
- Firebase CLI for all Firebase emulator functionality

## Notes

- Local environment provides hybrid approach: local development with all emulated Firebase services
- This gives developers choice between full emulator safety and local development speed
- Firebase emulators provide safety while local servers provide speed
- Consider port configuration to avoid conflicts between local servers and emulators
- Hot reloading should work seamlessly in local mode

## Definition of Done

- [ ] All tasks completed and tested
- [ ] Code review completed
- [ ] Documentation updated and reviewed
- [ ] Local environment fully functional with hybrid setup
- [ ] Story acceptance criteria met
- [ ] Environment provides clear development workflow alternative 
