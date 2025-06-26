# Implement Auth Session Management and Error Handling

## Description
As a **user**, I want **the application to handle authentication errors gracefully and validate my session status**, so that **I am automatically redirected to login when my account is disabled or removed, and I don't experience broken functionality due to invalid authentication states**.

## Details
Currently, when a user logs in but is subsequently removed from Firebase Auth (e.g., for account blocking/suspension), the web application continues to operate as if the user is authenticated. However, API calls to protected endpoints fail with 401 status codes, leading to broken functionality without clear user feedback.

This story implements comprehensive authentication session management that:

1. **Proactive Auth Validation**: Validates auth status on navigation to detect stale sessions
2. **Intelligent Caching**: Uses time-based caching to balance security with performance  
3. **Reactive Error Handling**: Responds to 401 errors from any API endpoint by re-validating auth
4. **Graceful User Experience**: Provides clear feedback and smooth transitions to login when needed

**Business Context**: This addresses a critical security and UX gap where blocked/removed users can continue using the app in a broken state, potentially causing confusion and security concerns.

## Dependencies
- [ ] Existing authentication system (Firebase Auth + API auth endpoints)
- [ ] Current route protection implementation
- [ ] Auth context and API client infrastructure

## Acceptance Criteria

### Auth Status Validation
- [ ] **Home page navigation** always validates auth status by calling `/api/auth` endpoint
- [ ] **Protected page navigation** validates auth status with 1-2 minute caching to reduce API calls
- [ ] **Failed auth validation** (401 response) redirects user to login page immediately
- [ ] **Successful auth validation** allows normal page navigation and updates cached auth status

### API Error Handling  
- [ ] **401 responses from any API endpoint** trigger immediate auth status re-validation
- [ ] **Auth re-validation failure** redirects user to login page
- [ ] **Auth re-validation success** allows original API call to be retried (if applicable)
- [ ] **Error handling** preserves user context and intended navigation destination

### Caching Strategy
- [ ] **Auth status cache** expires after 1-2 minutes to balance performance vs security
- [ ] **Cache invalidation** occurs on 401 errors from any API endpoint
- [ ] **Manual cache refresh** available for immediate validation when needed
- [ ] **Cache persistence** handles browser refresh and tab navigation scenarios

### User Experience
- [ ] **Loading states** shown during auth validation to prevent jarring transitions
- [ ] **Error messages** provide clear feedback when auth failures occur
- [ ] **Login redirect** preserves intended destination for post-login navigation
- [ ] **Seamless transitions** between authenticated and unauthenticated states

## Technical Requirements

### Frontend Implementation
- [ ] **Auth validation service** with caching and retry logic
- [ ] **API interceptor** to handle 401 responses from any endpoint
- [ ] **Navigation guards** for home page and protected routes
- [ ] **Cache management** with configurable expiration timing

### Error Handling Integration
- [ ] **HTTP interceptor** integration with existing API client
- [ ] **Auth context updates** to reflect validation results
- [ ] **Route protection enhancements** to leverage new validation system
- [ ] **Error boundary integration** for graceful failure handling

### Performance Considerations
- [ ] **Minimal API calls** through intelligent caching strategy
- [ ] **Parallel validation** to avoid blocking user interactions
- [ ] **Efficient state management** to prevent unnecessary re-renders
- [ ] **Memory management** for cache cleanup and lifecycle handling

## Tasks

### Task 1: Implement Auth Validation Service
- [ ] Create `AuthValidationService` with caching and API integration
  - Implement cached auth status checking with configurable expiration (1-2 minutes)
  - Add methods for immediate validation (bypass cache) and cached validation  
  - Include retry logic for network failures
  - Add proper TypeScript types and error handling
- [ ] Add comprehensive unit tests for auth validation logic
  - Test caching behavior with different expiration scenarios
  - Test immediate validation vs cached validation paths
  - Test error handling for network failures and API errors
  - Test cache invalidation and refresh scenarios
- [ ] Update documentation for auth validation patterns and usage

### Task 2: Implement API Response Interceptor
- [ ] Create HTTP interceptor to handle 401 responses globally
  - Intercept all API responses and detect 401 status codes
  - Trigger auth re-validation when 401 errors occur
  - Invalidate auth cache on 401 detection
  - Redirect to login on auth validation failure
  - Preserve original request context for potential retry
- [ ] Add comprehensive tests for interceptor behavior
  - Test 401 detection and auth re-validation triggering
  - Test successful re-validation with request retry
  - Test failed re-validation with login redirect
  - Test interceptor integration with different API endpoints
- [ ] Integrate interceptor with existing API client configuration

### Task 3: Enhance Navigation and Route Protection
- [ ] Implement navigation-based auth validation
  - Add always-validate logic for home page navigation
  - Add cached validation for other protected routes
  - Update `ProtectedRoute` component to use new validation service
  - Ensure validation occurs before component rendering
- [ ] Add comprehensive tests for navigation auth validation
  - Test home page always-validation behavior
  - Test protected route cached validation
  - Test validation failure handling and redirects
  - Test loading states during validation
- [ ] Update route protection documentation and examples

### Task 4: Implement User Experience Enhancements
- [ ] Add loading states and error feedback for auth validation
  - Show loading indicators during auth validation
  - Display appropriate error messages for auth failures
  - Implement graceful transitions between auth states
  - Preserve user navigation intent during redirects
- [ ] Add comprehensive E2E tests for user scenarios
  - Test complete user flow from auth failure to login redirect
  - Test navigation preservation and restoration after login
  - Test error message display and user feedback
  - Test loading states and transition smoothness
- [ ] Update user-facing documentation for auth error scenarios

### Task 5: Integration and Configuration
- [ ] Integrate all components with existing auth system
  - Connect validation service with current `AuthContext`
  - Integrate interceptor with API client configuration
  - Update navigation components to use new validation logic
  - Configure caching timeouts and validation parameters
- [ ] Add comprehensive integration tests
  - Test full auth validation flow with real API endpoints
  - Test integration with Firebase Auth and session management
  - Test performance impact and caching effectiveness
  - Test edge cases and error recovery scenarios
- [ ] Update deployment and configuration documentation

## Notes

### Implementation Approach
- **Incremental Enhancement**: Build on existing auth infrastructure rather than replacing it
- **Performance First**: Use intelligent caching to minimize API calls while maintaining security
- **User Experience Focus**: Prioritize smooth transitions and clear feedback over strict security timing

### Technical Considerations
- **Cache Timing**: Start with 2-minute cache for user testing, adjust based on feedback
- **API Call Optimization**: Batch validation calls where possible to reduce server load
- **Error Recovery**: Implement robust retry logic for network failures vs auth failures
- **Browser Compatibility**: Ensure interceptor and caching work across supported browsers

### Future Enhancements
- **Configurable Cache Duration**: Allow admin configuration of cache expiration timing
- **Advanced Retry Logic**: Implement exponential backoff for failed validation attempts
- **Analytics Integration**: Track auth validation patterns for performance optimization
- **Offline Handling**: Consider offline scenarios and cached auth state management

### Original issue report

> I just got an error that should be handled in the web app, which happens when the user logs in to the application and 
> then the user is removed from firestore auth, making subsequent web app calls to the api/auth fail with status 401. 
> This scenario could happen if we want to block a user for any reasons, and when it happens the user should be 
> redirected to the login page.

> A good way to fix this is by calling the auth endpoint every time the user navigates to the home page and redirect to 
> the login page if the call fails with a 401 status. We should also check the auth status when navigating to any other 
> protected page, but in this case we should cache the auth status for 1 ou 2 minutes to decrease the api calls count. 
> Also, when receiving a 401 from any other endpoint, we should call the auth endpoint again to check if the user still 
> has access to the application.
