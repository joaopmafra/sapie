# Story 31: Create and Display User's Root Directory

## Story Summary

As a user, I need to see my personal "My Contents" directory when I log in, so that I have a clear starting point for managing my study content and can immediately begin using the application.

## Business Value

- **Immediate User Value**: Users see their personal workspace immediately upon login
- **Complete User Workflow**: From authentication to content workspace visualization
- **Foundation for Growth**: Establishes the entry point for all future content features
- **User Confidence**: Users understand where their content will live

## Feature Context

**Parent Feature**: [Feature 26: Basic Note Management](../2-features/1-ready/26-feature-basic_note_management.md)

**Epic Context**: [Epic 23: Content Management Foundation](../1-epics/1-ready/23-epic-content_management_foundation.md)

**Iteration Philosophy**: "Scooter" implementation - complete, working solution that provides immediate value

## Story Scope

### ✅ Included (Full-Stack Implementation)
- Content entity with TypeScript interfaces (backend)
- Firestore integration for root directory metadata (backend)
- Root directory auto-creation service (backend)
- API endpoint to get user's root directory (backend)
- React component to display root directory (frontend)
- Navigation to content workspace (frontend)
- Basic error handling and loading states (full-stack)
- Authentication integration (full-stack)

### ❌ Excluded (Future Stories)
- Note creation functionality (Story 32)
- Content editing capabilities (Story 33)
- Advanced UI components (Story 34)
- Multiple content types (Future)

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

### API Endpoint

```typescript
GET /api/content/root  // Get or create user's root directory
```

### Frontend Component

```typescript
// ContentWorkspacePage.tsx - Main page showing user's root directory
// Displays "My Contents" with empty state and placeholder for future content
```

## User Experience Flow

1. **User logs in** → Authentication completes
2. **System creates root directory** (if first time) → "My Contents" directory exists
3. **User navigates to content workspace** → ContentWorkspacePage loads
4. **User sees "My Contents" directory** → Clear indication of their personal workspace
5. **User sees empty state** → Helpful message explaining they can add content here (future)

## Tasks

### Task 1: Create Content Entity and TypeScript Types
**Acceptance Criteria:**
- [ ] Content interface defined with all required fields
- [ ] ContentDocument interface for Firestore serialization
- [ ] ContentType enum for content types
- [ ] Proper TypeScript types exported and available to both backend and frontend

**Implementation Steps:**
1. Create `packages/api/src/content/entities/content.entity.ts`
2. Define Content interface with all fields
3. Define ContentDocument interface for Firestore
4. Create ContentType enum
5. Export types from `packages/api/src/content/index.ts`

**Testing:**
- [ ] TypeScript compilation succeeds
- [ ] All types properly exported

### Task 2: Implement Root Directory Service (Backend)
**Acceptance Criteria:**
- [ ] RootDirectoryService class created
- [ ] Auto-creates root directory on user first access
- [ ] Integrates with Firestore
- [ ] Idempotent operation (safe to call multiple times)
- [ ] Proper error handling and logging

**Implementation Steps:**
1. Create `packages/api/src/content/services/root-directory.service.ts`
2. Implement RootDirectoryService class
3. Add Firebase Admin SDK integration
4. Implement `ensureRootDirectory(userId: string)` method
5. Add comprehensive error handling

**Testing:**
- [ ] Unit tests for root directory creation
- [ ] Idempotency tests
- [ ] Error handling tests

### Task 3: Create Root Directory API Endpoint
**Acceptance Criteria:**
- [ ] GET /api/content/root endpoint implemented
- [ ] Returns root directory metadata
- [ ] Authentication guard applied
- [ ] Auto-creates root directory if not exists
- [ ] Proper HTTP status codes and error handling

**Implementation Steps:**
1. Create `packages/api/src/content/controllers/content.controller.ts`
2. Implement ContentController class
3. Add `getRootDirectory()` method
4. Apply AuthGuard to endpoint
5. Integrate with RootDirectoryService

**Testing:**
- [ ] Unit tests for endpoint
- [ ] Authentication tests
- [ ] Auto-creation tests

### Task 4: Create Content Module (Backend)
**Acceptance Criteria:**
- [ ] ContentModule properly configured
- [ ] All services registered
- [ ] Proper dependency injection
- [ ] Firebase services configured

**Implementation Steps:**
1. Create `packages/api/src/content/content.module.ts`
2. Register all content services
3. Configure Firebase Admin dependencies
4. Export ContentModule
5. Import in AppModule

**Testing:**
- [ ] Module loads correctly
- [ ] All services can be injected

### Task 5: Create Content Service (Frontend)
**Acceptance Criteria:**
- [ ] API client service for content operations
- [ ] TypeScript types imported from backend
- [ ] Error handling for API calls
- [ ] Integration with authentication context

**Implementation Steps:**
1. Create `packages/web/src/lib/content/content-service.ts`
2. Implement `getRootDirectory()` method
3. Add proper error handling
4. Import and use Content types
5. Integrate with existing API client setup

**Testing:**
- [ ] Unit tests for service methods
- [ ] Error handling tests

### Task 6: Create Content Workspace Page (Frontend)
**Acceptance Criteria:**
- [ ] ContentWorkspacePage component created
- [ ] Displays "My Contents" root directory
- [ ] Shows loading state while fetching
- [ ] Shows error state if API fails
- [ ] Clean, intuitive design
- [ ] Responsive for mobile devices

**Implementation Steps:**
1. Create `packages/web/src/pages/ContentWorkspacePage.tsx`
2. Implement React component with hooks
3. Add loading and error states
4. Create basic UI showing directory name
5. Add responsive design
6. Handle authentication requirements

**Testing:**
- [ ] Component renders correctly
- [ ] Loading states work
- [ ] Error handling works

### Task 7: Add Navigation and Routing
**Acceptance Criteria:**
- [ ] Route added to React Router
- [ ] Navigation from main app to content workspace
- [ ] Proper route protection (authenticated users only)
- [ ] Clear navigation indicators

**Implementation Steps:**
1. Add route to `packages/web/src/main.tsx` or routing config
2. Update navigation/header component
3. Add route protection using existing auth guards
4. Test navigation flow

**Testing:**
- [ ] Routing works correctly
- [ ] Authentication protection works
- [ ] Navigation is intuitive

### Task 8: Integration Testing and Polish
**Acceptance Criteria:**
- [ ] Full end-to-end workflow tested
- [ ] Error handling across full stack
- [ ] Performance meets requirements
- [ ] User experience is smooth and intuitive

**Implementation Steps:**
1. Test complete user flow from login to seeing workspace
2. Add comprehensive error handling
3. Optimize performance
4. Polish UI/UX details
5. Add loading animations/states

**Testing:**
- [ ] E2E tests for complete workflow
- [ ] Performance benchmarks met
- [ ] Error scenarios tested

## Acceptance Criteria

### Functional Criteria
- [ ] Users see "My Contents" directory immediately after login
- [ ] Root directory auto-created for new users
- [ ] Proper user isolation (users only see their own directory)
- [ ] Complete authentication integration
- [ ] Responsive design works on mobile

### Technical Criteria
- [ ] Full-stack TypeScript types consistency
- [ ] Comprehensive error handling
- [ ] Performance: Root directory loads in <2 seconds
- [ ] Security: Authentication enforced
- [ ] Code quality: Linting and formatting passes

### User Experience Criteria
- [ ] Clear indication of personal workspace
- [ ] Intuitive navigation
- [ ] Helpful empty state messaging
- [ ] Smooth loading states
- [ ] Error messages are user-friendly

## Definition of Done

- [ ] All tasks completed and tested
- [ ] Full-stack integration working
- [ ] Code review completed
- [ ] All acceptance criteria met
- [ ] Unit and integration tests passing
- [ ] E2E test covers complete user workflow
- [ ] Documentation updated
- [ ] Performance benchmarks met

## Dependencies

- Firebase Admin SDK configured
- Cloud Storage bucket configured
- Authentication middleware available
- React routing setup
- TypeScript project setup

## Success Metrics

### User Engagement
- Users successfully see their workspace >95% of the time
- Time from login to workspace view <3 seconds
- Zero confusion about where content belongs

### Technical Performance
- Root directory API response <500ms
- Page load time <2 seconds
- Zero authentication failures
- Error rate <1%

## Notes

**Full-Stack Story Philosophy**: This story delivers complete user value by implementing both backend storage and frontend display. Users get immediate benefit - they see their personal workspace and understand where their content will live.

**"Scooter" Implementation**: This is a complete, working solution that users can immediately benefit from, even though it's simple. It establishes the foundation that all future content features will build upon.

**Future Growth**: This story creates the foundation for Story 32 (adding note creation) and beyond, but delivers standalone value. 
