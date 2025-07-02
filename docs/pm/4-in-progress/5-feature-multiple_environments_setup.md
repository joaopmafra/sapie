# Feature 5: Multiple Environments Setup

## Feature Summary

Establish a comprehensive multi-environment infrastructure that enables safe development, testing, and deployment
workflows for the Sapie knowledge management application. This feature provides six distinct environments (emulator,
test-e2e, local, development, staging, production) that support the complete development lifecycle from local
development to production deployment.

## Business Value

**Core Development Need**: Development teams need isolated environments to develop, test, and deploy applications safely
without risking production data or functionality.

**Value Proposition**: Developers can work confidently knowing that:

- Local development never affects production data
- Testing environments are completely isolated
- Deployment processes are validated before production
- Environment switching is seamless and well-documented

**Strategic Importance**: This foundation enables all future development by providing safe, scalable infrastructure for
the entire development lifecycle.

## Feature Scope

### ✅ Included in This Feature

1. **Safe Development Environments**
    - Emulator environment as default development (complete Firebase emulation)
    - Local environment for fast iteration (hybrid local + emulated auth)
    - Clear environment switching and configuration management
    - Data isolation preventing production accidents

2. **Isolated Testing Infrastructure**
    - Dedicated E2E testing environment with clean data state
    - Automated test data cleanup between runs
    - Parallel execution capabilities with development environments
    - Foundation for CI/CD integration

3. **Production-Ready Deployment Pipeline**
    - Development environment for deployment validation
    - Staging environment for pre-production testing
    - Production environment with enterprise-grade security
    - Comprehensive deployment scripts and validation

4. **Developer Experience Excellence**
    - Comprehensive documentation and troubleshooting guides
    - Unified workspace scripts supporting all environments
    - Clear environment switching procedures
    - New developer onboarding documentation

### ❌ Explicitly Excluded (Future Enhancements)

- CI/CD pipeline automation → Future DevOps feature
- Advanced monitoring and alerting → Future Operations feature
- Backup and disaster recovery → Future Reliability feature
- Multi-region deployment → Future Scaling feature

## Technical Architecture

### Environment Strategy

| Environment | Firebase Project | Web/API Runtime   | Firebase Services | Purpose                                        |
|-------------|------------------|-------------------|-------------------|------------------------------------------------|
| emulator    | `demo-emulator`  | Firebase Emulator | Auth emulator     | Full emulator development (default)            |
| test-e2e    | `demo-test-e2e`  | Firebase Emulator | Auth emulator     | Automated testing                              |
| local-dev   | `demo-local-dev`     | Local servers     | Auth emulator     | Development with local servers + emulated auth |
| development | `sapie-dev`      | Firebase hosting  | Real Firebase     | Development deployment                         |
| staging     | `sapie-staging`  | Firebase hosting  | Real Firebase     | Pre-production validation                      |
| production  | `sapie-prod`     | Firebase hosting  | Real Firebase     | Live application                               |

### Configuration Management

**Environment Variables Strategy**

```typescript
// Environment-specific configuration
.
env.development    // Emulator environment
    .env.local.example  // Local development template
    .env.staging        // Staging environment
    .env.production     // Production environment
```

**Firebase Project Configuration**

```typescript
// .firebaserc with environment aliases
{
    "projects"
:
    {
        "emulator"
    :
        "demo-emulator",
            "test-e2e"
    :
        "demo-test-e2e",
            "local"
    :
        "demo-local-dev",
            "local-dev"
    :
        "sapie-dev",
            "staging"
    :
        "sapie-staging",
            "prod"
    :
        "sapie-prod"
    }
}
```

### Build and Deployment Scripts

**Development Scripts**

```bash
npm run dev:emulator     # Default development (emulator)
npm run dev:local        # Local servers + auth emulator
npm run test:e2e         # E2E tests in isolated environment
```

**Deployment Scripts**

```bash
npm run build:dev        # Build for development environment
npm run deploy:dev       # Deploy to development
npm run deploy:staging   # Deploy to staging
npm run deploy:prod      # Deploy to production (with safety checks)
```

### Security and Isolation

- **Demo Projects**: Minimal Firebase configuration for safe development
- **Real Projects**: Full security configuration for deployments
- **Data Isolation**: Complete separation between all environments
- **Access Controls**: Proper IAM permissions for each environment
- **Environment Validation**: Pre-deployment checks and safety measures

## Implementation Stories

This feature is implemented through seven sequential stories:

### Phase 1: Foundation (Safe Development)

- **Story 38**: Setup Emulator Environment (Default Development)
- **Story 39**: Setup Test-E2E Environment
- **Story 40**: Setup Local Environment (Hybrid Local Development)

### Phase 2: Deployment Pipeline (Real Environments)

- **Story 41**: Setup Development Environment (First Real Deployment)
- **Story 42**: Setup Staging Environment
- **Story 43**: Setup Production Environment

### Phase 3: Integration (Complete Experience)

- **Story 44**: Finalize Environment Integration and Documentation

## Acceptance Criteria

### Functional Requirements

- [ ] All six environments are properly configured and accessible
- [ ] Developers can switch between environments seamlessly
- [ ] Environment isolation is complete (no cross-environment data contamination)
- [ ] Build and deployment scripts work reliably for all environments
- [ ] E2E tests run in complete isolation without affecting other environments

### Technical Requirements

- [ ] Firebase projects configured appropriately for each environment type
- [ ] Environment variables properly managed and secure
- [ ] Local development defaults to safe emulator environment
- [ ] Authentication and API connectivity work in all environments
- [ ] Deployment processes include validation and safety checks

### Developer Experience Requirements

- [ ] Comprehensive documentation covers all environments and workflows
- [ ] Environment switching is clearly documented and easy to follow
- [ ] Troubleshooting guides address common environment issues
- [ ] New developer onboarding includes complete environment setup
- [ ] All environments support the existing authentication and content management features

### Security and Reliability Requirements

- [ ] Production environment has maximum security configuration
- [ ] No sensitive data stored in version control
- [ ] Proper access controls configured for all real environments
- [ ] Environment validation prevents accidental production deployment
- [ ] Rollback procedures documented and tested

## Dependencies

- Firebase CLI and understanding of Firebase project management
- Team access to Firebase Console for all environments
- Understanding of current application architecture and configuration
- Vite and NestJS development server knowledge for local environment

## Success Metrics

- **Development Velocity**: Faster development cycles with safe environment switching
- **Deployment Confidence**: Zero production incidents due to deployment validation
- **Team Onboarding**: New developers productive within 1 day using environment documentation
- **Testing Reliability**: Consistent E2E test results in isolated environment

## Definition of Done

- [ ] All implementation stories (38-44) completed and validated
- [ ] Code review completed for all environment configurations
- [ ] Documentation comprehensive and tested by team members
- [ ] All environments tested and validated
- [ ] Feature acceptance criteria met
- [ ] Team training completed on environment usage 
