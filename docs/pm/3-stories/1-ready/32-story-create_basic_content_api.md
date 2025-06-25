# Story 32: Create Basic Content API

## Story Summary

As a developer, I need to implement RESTful API endpoints for content management, so that the frontend can perform CRUD operations on user content with proper authentication and error handling.

## Business Value

- Enables frontend to interact with content storage system
- Provides secure, authenticated access to user content
- Establishes API foundation for all content features
- Implements proper error handling and validation

## Feature Context

**Parent Feature**: [Feature 26: Basic Note Management](../../2-features/1-ready/26-feature-basic_note_management.md)

**Epic Context**: [Epic 23: Content Management Foundation](../../1-epics/1-ready/23-epic-content_management_foundation.md)

**Implementation Phase**: Phase 1 - Backend Foundation (API Package)

## Story Scope

### ✅ Included
- RESTful API endpoints for content CRUD operations
- Authentication middleware integration
- Basic error handling and validation
- Content controller with proper HTTP status codes
- API documentation and type definitions

### ❌ Excluded
- Frontend components (Story 33)
- Content service layer (Story 34)
- Note editor integration (Story 35)
- Auto-save functionality (Story 36)

## API Endpoints Specification

```typescript
// Content Controller Endpoints
GET    /api/content/root              // Get user's root directory
GET    /api/content/:id/children      // List directory contents  
GET    /api/content/:id               // Get content metadata
POST   /api/content                   // Create new content
PUT    /api/content/:id               // Update content
DELETE /api/content/:id               // Delete content
GET    /api/content/:id/download      // Get signed URL for content
```

## Tasks

### Task 1: Create Content Controller
**Acceptance Criteria:**
- [ ] ContentController class created
- [ ] All CRUD endpoints implemented
- [ ] Proper HTTP status codes returned
- [ ] Authentication guard applied to all endpoints
- [ ] Request/response DTOs defined

**Implementation Steps:**
1. Create `src/content/controllers/content.controller.ts`
2. Implement ContentController class with @Controller decorator
3. Add all required endpoints with proper decorators
4. Apply AuthGuard to all endpoints
5. Implement proper error handling

**Testing:**
- [ ] Unit tests for all endpoints
- [ ] Authentication tests
- [ ] Error handling tests

### Task 2: Create Content DTOs
**Acceptance Criteria:**
- [ ] CreateContentDto defined
- [ ] UpdateContentDto defined
- [ ] ContentResponseDto defined
- [ ] Proper validation decorators applied
- [ ] API documentation decorators added

**Implementation Steps:**
1. Create `src/content/dto/create-content.dto.ts`
2. Create `src/content/dto/update-content.dto.ts`
3. Create `src/content/dto/content-response.dto.ts`
4. Add class-validator decorators
5. Add Swagger API decorators

**Testing:**
- [ ] DTO validation tests
- [ ] Serialization tests

### Task 3: Implement Root Directory Endpoint
**Acceptance Criteria:**
- [ ] GET /api/content/root endpoint implemented
- [ ] Auto-creates root directory if not exists
- [ ] Returns root directory metadata
- [ ] Proper error handling for authentication failures

**Implementation Steps:**
1. Implement getRootDirectory method in controller
2. Integrate with RootDirectoryService
3. Handle root directory creation logic
4. Add proper error handling

**Testing:**
- [ ] Root directory retrieval tests
- [ ] Auto-creation tests
- [ ] Authentication failure tests

### Task 4: Implement Content CRUD Endpoints
**Acceptance Criteria:**
- [ ] POST /api/content endpoint for creation
- [ ] GET /api/content/:id endpoint for retrieval
- [ ] PUT /api/content/:id endpoint for updates
- [ ] DELETE /api/content/:id endpoint for deletion
- [ ] Proper validation and error handling

**Implementation Steps:**
1. Implement createContent method
2. Implement getContent method
3. Implement updateContent method
4. Implement deleteContent method
5. Add validation and error handling

**Testing:**
- [ ] Content creation tests
- [ ] Content retrieval tests
- [ ] Content update tests
- [ ] Content deletion tests
- [ ] Validation error tests

### Task 5: Implement Directory Listing Endpoint
**Acceptance Criteria:**
- [ ] GET /api/content/:id/children endpoint implemented
- [ ] Returns list of child content items
- [ ] Supports pagination (basic)
- [ ] Proper error handling for non-existent directories

**Implementation Steps:**
1. Implement getContentChildren method
2. Integrate with ContentService.listContent
3. Add basic pagination support
4. Handle directory not found errors

**Testing:**
- [ ] Directory listing tests
- [ ] Pagination tests
- [ ] Error handling tests

### Task 6: Implement Content Download Endpoint
**Acceptance Criteria:**
- [ ] GET /api/content/:id/download endpoint implemented
- [ ] Returns signed URL for content access
- [ ] Proper permission checks
- [ ] URL expiration handling

**Implementation Steps:**
1. Implement downloadContent method
2. Integrate with ContentStorageService
3. Generate signed URLs
4. Add permission validation

**Testing:**
- [ ] Signed URL generation tests
- [ ] Permission validation tests
- [ ] URL expiration tests

### Task 7: Add API Documentation
**Acceptance Criteria:**
- [ ] Swagger documentation for all endpoints
- [ ] Request/response examples
- [ ] Error response documentation
- [ ] Authentication documentation

**Implementation Steps:**
1. Add @ApiTags decorator to controller
2. Add @ApiOperation decorators to all methods
3. Add @ApiResponse decorators for all responses
4. Document authentication requirements

**Testing:**
- [ ] Swagger documentation generates correctly
- [ ] All endpoints documented

## Acceptance Criteria

### Functional Criteria
- [ ] All API endpoints respond correctly
- [ ] Proper authentication enforcement
- [ ] Content CRUD operations work end-to-end
- [ ] Root directory auto-creation works
- [ ] Signed URLs generate correctly

### Technical Criteria
- [ ] All endpoints return proper HTTP status codes
- [ ] Comprehensive error handling implemented
- [ ] Request/response validation working
- [ ] API documentation complete
- [ ] Unit tests cover all endpoints

### Performance Criteria
- [ ] API responses < 500ms for metadata operations
- [ ] Signed URL generation < 100ms
- [ ] Proper error handling doesn't degrade performance
- [ ] Authentication checks are efficient

## Definition of Done

- [ ] All tasks completed and tested
- [ ] Code review completed
- [ ] All acceptance criteria met
- [ ] Unit tests passing (>80% coverage)
- [ ] Integration tests passing
- [ ] API documentation updated
- [ ] Swagger documentation generated

## Dependencies

- Story 31 (Content Storage Foundation) completed
- Authentication middleware available
- Firebase Admin SDK configured
- Content services implemented

## Notes

- This story completes Phase 1 (Backend Foundation) along with Story 31
- Focus on proper REST API design principles
- Ensure consistent error handling across all endpoints
- Consider this the "API gateway" to content functionality 