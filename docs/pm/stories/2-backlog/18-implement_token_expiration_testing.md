# Implement Token Expiration Testing

## Description

As a developer, I want to implement comprehensive token expiration testing to ensure the API properly handles expired
Firebase ID tokens and maintains security standards.

## Details

This story addresses the token expiration testing scenarios that were identified but not implemented in story #15 due to
their complexity with Firebase Auth. Firebase ID tokens have a 1-hour lifespan and are automatically refreshed by the
Firebase SDK, making expiration testing more challenging than standard JWT testing.

The implementation will need to handle:

- Generating or simulating expired tokens
- Testing API responses to expired tokens
- Validating security behavior under edge cases
- Ensuring proper error messages and status codes

## Dependencies

- [x] Story #15: Add API authentication and authorization (must be completed first)

## Acceptance Criteria

- [ ] API properly rejects expired Firebase ID tokens with appropriate error responses
- [ ] Token expiration scenarios are tested in both Playwright E2E tests and NestJS E2E tests
- [ ] Security vulnerability testing covers token expiration edge cases
- [ ] Documentation includes token expiration testing methodology
- [ ] Tests cover both natural expiration and malformed expiration claims
- [ ] Performance impact of token verification with expired tokens is acceptable

## Technical Requirements

- [ ] Use Firebase Admin SDK test utilities or custom token generation for creating expired tokens
- [ ] Implement time-based testing without requiring actual 1-hour waits
- [ ] Support testing different expiration scenarios (slightly expired, long expired, malformed exp claim)
- [ ] Maintain compatibility with Firebase Auth emulator
- [ ] Tests should be deterministic and not rely on external timing

## Tasks

### Research & Design

- [ ] Research Firebase Admin SDK custom token capabilities
    - Investigate `admin.auth().createCustomToken()` for creating tokens with custom expiration
    - Explore Firebase Auth emulator token manipulation capabilities
    - Document best practices for token expiration testing
- [ ] Design token expiration test scenarios
    - Define edge cases to test (just expired, long expired, malformed)
    - Plan test data setup and cleanup strategies
    - Design test utilities for token manipulation

### Implementation - Playwright E2E Tests

- [ ] Implement Firebase Admin SDK test utilities
    - Add Firebase Admin SDK to test-e2e package dependencies
    - Create utilities for generating custom tokens with expiration
    - Implement token manipulation helpers
- [ ] Add token expiration tests to `packages/test-e2e/tests/api/auth.spec.ts`
    - Test recently expired tokens (e.g., expired 1 minute ago)
    - Test long-expired tokens (e.g., expired 1 day ago)
    - Test tokens with malformed expiration claims
    - Test tokens with future expiration dates (should pass)
- [ ] Update test utilities and documentation
    - Extend `firebase-auth-utils.ts` with expiration testing functions
    - Add test scenarios to `test-utils.ts`
    - Update API README with expiration testing documentation

### Implementation - NestJS E2E Tests

- [ ] Add token expiration tests to `packages/api/test/` directory
    - Mirror Playwright tests in NestJS E2E test format
    - Test API-level token verification logic
    - Ensure consistent behavior between test environments
- [ ] Implement backend test utilities
    - Create Firebase Admin test helpers for API tests
    - Add token generation utilities for NestJS tests
    - Ensure proper test isolation and cleanup

### Testing & Validation

- [ ] Validate test reliability and performance
    - Ensure tests are deterministic and don't rely on external timing
    - Verify tests run efficiently without long waits
    - Test edge cases and error handling
- [ ] Cross-environment testing
    - Verify tests work in both local development and CI environments
    - Test with different Firebase emulator configurations
    - Validate test stability across different Node.js versions

### Documentation

- [ ] Document token expiration testing methodology
    - Explain how expired tokens are generated for testing
    - Document test scenarios and expected behaviors
    - Add troubleshooting guide for token testing issues
- [ ] Update API documentation
    - Document token expiration behavior
    - Add security considerations for token handling
    - Update authentication guides with expiration information

## Technical Implementation Notes

### Approach Options

1. **Firebase Admin Custom Tokens**: Use `admin.auth().createCustomToken()` with short expiration times
2. **Token Manipulation**: Manually create or modify JWT tokens with expired claims
3. **Time Mocking**: Mock system time to make valid tokens appear expired
4. **Emulator Features**: Explore Firebase emulator capabilities for token manipulation

### Recommended Approach

Start with Firebase Admin custom tokens as they maintain compatibility with Firebase Auth while providing control over
expiration. Fall back to manual JWT manipulation if needed for edge cases.

### Security Considerations

- Ensure test tokens are only used in test environments
- Validate that expired token rejection doesn't leak information
- Test for timing attacks on token verification
- Verify error messages don't expose internal details

## Notes

This story was created from the token expiration testing TODO identified in story #15. The complexity of Firebase Auth
token expiration testing justified creating a separate story to properly plan and implement these scenarios.

The implementation should prioritize security and reliability while maintaining the existing Firebase Auth emulator
integration established in story #15. 
