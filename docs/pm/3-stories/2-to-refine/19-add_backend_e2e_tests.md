# Add Backend E2E Tests in API Package

## Description

As a developer, I want comprehensive E2E tests in the API package to ensure the backend functionality is thoroughly
tested using NestJS testing infrastructure.

## Dependencies

- Story #15: Add API authentication and authorization (should be completed first for auth-related tests)

## Tasks

### Backend Testing Infrastructure

- [ ] Set up comprehensive E2E test suite in `packages/api/test` directory
- [ ] Add E2E tests for authentication endpoints
- [ ] Add E2E tests for protected routes
- [ ] Add E2E tests for user management functionality
- [ ] Add E2E tests for error handling scenarios
- [ ] Configure test database/environment for E2E tests
- [ ] Add test utilities for common testing patterns
- [ ] Ensure tests can run in CI/CD pipeline

### Documentation

- [ ] Document the distinction between Playwright and NestJS E2E tests
    - Most API tests should be NestJS E2E tests
    - Use Playwright for end-to-end tests that require browser interaction
- [ ] Add guidelines for writing and maintaining backend E2E tests
- [ ] Document test data setup and teardown procedures

## Acceptance Criteria

- [ ] Comprehensive E2E test coverage for all API endpoints
- [ ] Tests run independently and can be executed in any order
- [ ] Clear documentation on when to use NestJS E2E vs Playwright tests
- [ ] Test utilities are available for common testing scenarios
- [ ] Authentication-related endpoints are thoroughly tested

## Technical Requirements

- [ ] Use NestJS testing utilities and framework
- [ ] Tests should use isolated test environment/database
- [ ] Proper test data management (setup/teardown)
- [ ] Tests should be fast and reliable
- [ ] Follow existing project testing patterns and conventions 
