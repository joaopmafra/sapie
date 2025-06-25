# Story 31: Implement Content Storage Foundation

## Story Summary

As a developer, I need to implement the foundational content storage system with Firestore metadata and Cloud Storage content, so that the application can reliably store and retrieve user content using the hybrid storage approach.

## Business Value

- Establishes the core storage architecture for all content features
- Provides cost-effective storage solution (1000x cheaper than Firestore-only)
- Enables reliable content persistence and retrieval
- Foundation for all future content management features

## Feature Context

**Parent Feature**: [Feature 26: Basic Note Management](../../2-features/1-ready/26-feature-basic_note_management.md)

**Epic Context**: [Epic 23: Content Management Foundation](../../1-epics/1-ready/23-epic-content_management_foundation.md)

## Story Scope

### ✅ Included
- Content entity with TypeScript interfaces
- Firestore integration for metadata storage
- Cloud Storage service for content files
- Root directory auto-creation service
- Basic error handling and logging

### ❌ Excluded
- API endpoints (Story 32)
- Frontend components (Story 33)
- Editor integration (Story 34)
- Auto-save functionality (Story 36)

## Technical Requirements

### Data Model Implementation

```typescript
// Content entity interface
interface Content {
  id: string;
  name: string;
  type: 'directory' | 'note';
  parentId: string | null;
  ownerId: string;
  contentUrl?: string; // Only for files, not directories
  size?: number; // Only for files
  createdAt: Date;
  updatedAt: Date;
}

// Firestore document structure
interface ContentDocument {
  name: string;
  type: string;
  parentId: string | null;
  ownerId: string;
  contentUrl?: string;
  size?: number;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}
```

### Storage Services

- **ContentStorageService**: Handles Cloud Storage operations
- **ContentMetadataService**: Handles Firestore operations
- **ContentService**: Orchestrates both storage and metadata operations

## Tasks

### Task 1: Create Content Entity and TypeScript Types
**Acceptance Criteria:**
- [ ] Content interface defined with all required fields
- [ ] ContentDocument interface for Firestore serialization
- [ ] ContentType enum for content types
- [ ] Proper TypeScript types exported from index file

**Implementation Steps:**
1. Create `src/content/entities/content.entity.ts`
2. Define Content interface with all fields
3. Define ContentDocument interface for Firestore
4. Create ContentType enum
5. Export types from `src/content/index.ts`

**Testing:**
- [ ] TypeScript compilation succeeds
- [ ] All types properly exported

### Task 2: Implement Firestore Metadata Service
**Acceptance Criteria:**
- [ ] ContentMetadataService class created
- [ ] CRUD operations for content metadata
- [ ] Proper error handling for Firestore operations
- [ ] Firebase Admin SDK integration
- [ ] User-scoped queries (security)

**Implementation Steps:**
1. Create `src/content/services/content-metadata.service.ts`
2. Implement ContentMetadataService class
3. Add create, read, update, delete operations
4. Add listByParent method for directory listing
5. Implement proper error handling
6. Add user authentication checks

**Testing:**
- [ ] Unit tests for all CRUD operations
- [ ] Error handling tests
- [ ] Security tests (user isolation)

### Task 3: Implement Cloud Storage Content Service
**Acceptance Criteria:**
- [ ] ContentStorageService class created
- [ ] File upload/download operations
- [ ] Signed URL generation
- [ ] Proper file path structure
- [ ] Error handling for storage operations

**Implementation Steps:**
1. Create `src/content/services/content-storage.service.ts`
2. Implement ContentStorageService class
3. Add uploadContent method
4. Add downloadContent method (signed URLs)
5. Add deleteContent method
6. Implement structured file paths: `/{ownerId}/{contentType}/{contentId}`

**Testing:**
- [ ] Unit tests for upload/download operations
- [ ] Signed URL generation tests
- [ ] File path structure tests
- [ ] Error handling tests

### Task 4: Create Root Directory Auto-Creation Service
**Acceptance Criteria:**
- [ ] RootDirectoryService class created
- [ ] Auto-creates root directory on user first access
- [ ] Idempotent operation (safe to call multiple times)
- [ ] Proper error handling

**Implementation Steps:**
1. Create `src/content/services/root-directory.service.ts`
2. Implement RootDirectoryService class
3. Add ensureRootDirectory method
4. Implement idempotent logic
5. Add proper error handling

**Testing:**
- [ ] Unit tests for root directory creation
- [ ] Idempotency tests
- [ ] Error handling tests

### Task 5: Create Orchestrating Content Service
**Acceptance Criteria:**
- [ ] ContentService class created
- [ ] Combines metadata and storage operations
- [ ] Transaction-safe operations
- [ ] Proper cleanup on failures

**Implementation Steps:**
1. Create `src/content/services/content.service.ts`
2. Implement ContentService class
3. Add createContent method (metadata + storage)
4. Add updateContent method
5. Add deleteContent method (cleanup both stores)
6. Add getContent and listContent methods

**Testing:**
- [ ] Integration tests for combined operations
- [ ] Transaction safety tests
- [ ] Cleanup tests for failures

### Task 6: Create Content Module
**Acceptance Criteria:**
- [ ] ContentModule properly configured
- [ ] All services registered
- [ ] Proper dependency injection
- [ ] Firebase services configured

**Implementation Steps:**
1. Create `src/content/content.module.ts`
2. Register all content services
3. Configure Firebase dependencies
4. Export ContentModule

**Testing:**
- [ ] Module loads correctly
- [ ] All services can be injected
- [ ] Firebase configuration works

## Acceptance Criteria

### Functional Criteria
- [ ] Content entities can be created, read, updated, and deleted
- [ ] Metadata stored in Firestore, content in Cloud Storage
- [ ] Root directory auto-created for authenticated users
- [ ] Proper user isolation (users can only access their content)
- [ ] Error handling for all storage operations

### Technical Criteria
- [ ] All TypeScript types properly defined
- [ ] Comprehensive unit tests (>80% coverage)
- [ ] Integration tests for combined operations
- [ ] Proper error handling and logging
- [ ] Firebase Admin SDK properly configured

### Performance Criteria
- [ ] Content metadata queries < 500ms
- [ ] Cloud Storage uploads < 5s for 1MB files
- [ ] Signed URL generation < 100ms
- [ ] Root directory creation < 1s

## Definition of Done

- [ ] All tasks completed and tested
- [ ] Code review completed
- [ ] All acceptance criteria met
- [ ] TypeScript compilation successful
- [ ] All tests passing
- [ ] Documentation updated
- [ ] Performance benchmarks met

## Dependencies

- Firebase Admin SDK configured
- Cloud Storage bucket configured
- Authentication middleware available
- TypeScript project setup

## Notes

- This story establishes the foundational storage architecture
- Focus on reliability and data integrity
- Implement proper error handling from the start
- Consider this the "storage engine" for all content features 