# Story 32: Create and Edit Notes

## Story Summary

As a user, I need to create and edit notes within my "My Contents" directory, so that I can start taking and organizing
my study notes immediately in a digital format.

## Business Value

- **Complete Note-Taking Workflow**: Users can create, edit, and save notes end-to-end
- **Immediate Productivity**: Users can start taking notes immediately after seeing their workspace
- **Foundation for Learning**: Establishes the core content creation capability
- **User Satisfaction**: Users experience the full value of digital note-taking

## Feature Context

**Parent Feature**: [Feature 26: Basic Note Management](26-feature-basic_note_management.md)

**Epic Context**: [Epic 23: Content Management Foundation](../1-epics/1-ready/23-epic-content_management_foundation.md)

**Implementation Philosophy**: "Scooter" enhancement - adds complete note creation to the working directory display

## Story Scope

### ✅ Included (Full-Stack Implementation)

- Cloud Storage service for note content files (backend)
- Content metadata service for Firestore operations (backend)
- Complete CRUD API endpoints for notes (backend)
- Note creation modal and form (frontend)
- Markdown editor with auto-save (frontend)
- Note listing and management UI (frontend)
- End-to-end error handling and validation (full-stack)

### ❌ Excluded (Future Stories)

- Advanced editor features (LaTeX, syntax highlighting)
- Note sharing and collaboration
- Advanced formatting options
- Offline capabilities

## Technical Requirements

### Storage Architecture

- **Firestore**: Note metadata (fast queries, low cost)
- **Cloud Storage**: Note content as markdown files (1000x cheaper storage)
- **Access**: Signed URLs for secure content delivery
- **Caching**: Client-side content caching for performance

### API Endpoints

```
// Note CRUD operations
POST   /api/content                   // Create new note
GET    /api/content /:id              // Get note metadata
PUT    /api/content/:id               // Update note
DELETE /api/content/:id               // Delete note
GET    /api/content/:id/download      // Get signed URL for note content
GET    /api/content/:id/children      // List notes in directory
```

### Frontend Components

```
// Note management components
- CreateNoteModal.tsx          // Modal for creating new notes
- NoteEditor.tsx               // Markdown editor with auto-save
- NoteCard.tsx                 // Individual note preview in list
- NoteList.tsx                 // List of notes in directory
- DeleteConfirmModal.tsx       // Confirmation for note deletion
```

## User Experience Flow

### Creating a Note

1. **User clicks "Create Note"** → CreateNoteModal opens
2. **User enters note title** → Validation ensures title required
3. **User clicks "Create"** → Note created, editor opens
4. **User types content** → Auto-saves every 3 seconds
5. **User returns to directory** → Sees new note in list

### Editing a Note

1. **User clicks on note** → Note editor opens
2. **User edits content** → Auto-saves continuously
3. **User sees save status** → Visual feedback on save state
4. **User returns to directory** → Changes persisted

### Managing Notes

1. **User sees note list** → All notes displayed with previews
2. **User can delete notes** → Confirmation modal prevents accidents
3. **User sees loading states** → Clear feedback during operations

## Tasks

### Task 1: Implement Cloud Storage Service (Backend)

**Acceptance Criteria:**

- [ ] ContentStorageService class created
- [ ] File upload/download operations for markdown content
- [ ] Signed URL generation for secure access
- [ ] Structured file paths: `/{ownerId}/notes/{noteId}.md`
- [ ] Error handling for storage operations

**Implementation Steps:**

1. Create `packages/api/src/content/services/content-storage.service.ts`
2. Implement file upload for markdown content
3. Implement signed URL generation
4. Add proper file path structure
5. Add comprehensive error handling

**Testing:**

- [ ] Upload/download operations tested
- [ ] Signed URL generation tested
- [ ] File path structure validated

### Task 2: Implement Content Metadata Service (Backend)

**Acceptance Criteria:**

- [ ] ContentMetadataService class created
- [ ] CRUD operations for note metadata in Firestore
- [ ] User-scoped queries for security
- [ ] Proper error handling
- [ ] Integration with authentication

**Implementation Steps:**

1. Create `packages/api/src/content/services/content-metadata.service.ts`
2. Implement create, read, update, delete operations
3. Add listByParent method for directory listing
4. Implement user authentication checks
5. Add comprehensive error handling

**Testing:**

- [ ] All CRUD operations tested
- [ ] Security/user isolation tested
- [ ] Error handling validated

### Task 3: Create Note CRUD API Endpoints

**Acceptance Criteria:**

- [ ] Complete ContentController with all endpoints
- [ ] Proper DTOs for request/response validation
- [ ] Authentication guards on all endpoints
- [ ] Error handling with appropriate HTTP status codes
- [ ] API documentation with Swagger

**Implementation Steps:**

1. Extend `packages/api/src/content/controllers/content.controller.ts`
2. Create DTOs for note operations
3. Implement all CRUD endpoints
4. Add authentication and validation
5. Add Swagger documentation

**Testing:**

- [ ] All endpoints tested
- [ ] Authentication tested
- [ ] Validation tested

### Task 4: Create Note Creation UI (Frontend)

**Acceptance Criteria:**

- [ ] CreateNoteModal component created
- [ ] Form validation (title required)
- [ ] Integration with API
- [ ] Proper error handling
- [ ] Clean, intuitive design

**Implementation Steps:**

1. Create `packages/web/src/components/content/CreateNoteModal.tsx`
2. Implement modal with form
3. Add validation
4. Integrate with content service
5. Add error handling

**Testing:**

- [ ] Component renders correctly
- [ ] Form validation works
- [ ] API integration tested

### Task 5: Implement Markdown Editor (Frontend)

**Acceptance Criteria:**

- [ ] NoteEditor component with mdx-editor integration
- [ ] Auto-save functionality (3-second debounce)
- [ ] Save status indicator
- [ ] Error handling for save failures
- [ ] Responsive design

**Implementation Steps:**

1. Create `packages/web/src/components/content/NoteEditor.tsx`
2. Integrate mdx-editor
3. Implement auto-save with debouncing
4. Add save status display
5. Add error handling

**Testing:**

- [ ] Editor functionality tested
- [ ] Auto-save tested
- [ ] Error handling tested

### Task 6: Create Note List and Management UI (Frontend)

**Acceptance Criteria:**

- [ ] NoteList component showing all user notes
- [ ] NoteCard component for individual note previews
- [ ] Delete functionality with confirmation
- [ ] Loading states and error handling
- [ ] Responsive design

**Implementation Steps:**

1. Create `packages/web/src/components/content/NoteList.tsx`
2. Create `packages/web/src/components/content/NoteCard.tsx`
3. Create `packages/web/src/components/content/DeleteConfirmModal.tsx`
4. Add loading and error states
5. Implement responsive design

**Testing:**

- [ ] List displays correctly
- [ ] Delete functionality tested
- [ ] Loading states tested

### Task 7: Update Content Workspace Page (Frontend)

**Acceptance Criteria:**

- [ ] ContentWorkspacePage updated to show note creation
- [ ] Integration with note list and creation modal
- [ ] Proper state management
- [ ] Navigation to note editor
- [ ] Empty state handling

**Implementation Steps:**

1. Update `packages/web/src/pages/ContentWorkspacePage.tsx`
2. Integrate note creation and listing
3. Add navigation to editor
4. Implement state management
5. Handle empty states

**Testing:**

- [ ] Page integration tested
- [ ] Navigation tested
- [ ] State management validated

### Task 8: Create Content Service Layer (Frontend)

**Acceptance Criteria:**

- [ ] Complete content service for all note operations
- [ ] TypeScript types imported from backend
- [ ] Caching for performance
- [ ] Error handling and retry logic
- [ ] Integration with authentication

**Implementation Steps:**

1. Update `packages/web/src/lib/content/content-service.ts`
2. Implement all CRUD operations
3. Add client-side caching
4. Implement error handling
5. Add authentication integration

**Testing:**

- [ ] All service methods tested
- [ ] Caching tested
- [ ] Error handling validated

### Task 9: Add Routing and Navigation (Frontend)

**Acceptance Criteria:**

- [ ] Routes for note editor added
- [ ] Navigation between workspace and editor
- [ ] Proper route parameters for note IDs
- [ ] Route protection for authenticated users
- [ ] Breadcrumb navigation

**Implementation Steps:**

1. Add note editor routes
2. Update navigation components
3. Implement route parameters
4. Add route protection
5. Create breadcrumb navigation

**Testing:**

- [ ] Routing tested
- [ ] Navigation tested
- [ ] Route protection validated

### Task 10: End-to-End Integration and Polish

**Acceptance Criteria:**

- [ ] Complete user workflow tested
- [ ] Performance optimization
- [ ] Error handling across full stack
- [ ] UI/UX polish and animations
- [ ] Mobile responsiveness

**Implementation Steps:**

1. Test complete note creation workflow
2. Optimize performance (API calls, caching)
3. Polish UI/UX details
4. Add loading animations
5. Test mobile responsiveness

**Testing:**

- [ ] E2E workflow tested
- [ ] Performance benchmarks met
- [ ] Mobile testing completed

## Acceptance Criteria

### Functional Criteria

- [ ] Users can create notes with titles and markdown content
- [ ] Users can edit existing notes with live auto-save
- [ ] Users can delete notes with confirmation
- [ ] Users can see list of all their notes with previews
- [ ] All content is properly stored (metadata in Firestore, content in Cloud Storage)
- [ ] Complete authentication integration

### Technical Criteria

- [ ] Full-stack TypeScript type consistency
- [ ] Comprehensive error handling
- [ ] Performance: Note operations complete in <3 seconds
- [ ] Security: All endpoints authenticated
- [ ] Auto-save works reliably (3-second debounce)
- [ ] Client-side caching improves performance

### User Experience Criteria

- [ ] Intuitive note creation workflow
- [ ] Smooth editing experience with clear save feedback
- [ ] Clean note listing with helpful previews
- [ ] Responsive design works on mobile
- [ ] Loading states provide clear feedback
- [ ] Error messages are user-friendly

## Definition of Done

- [ ] All tasks completed and tested
- [ ] Full end-to-end workflow working
- [ ] Code review completed
- [ ] All acceptance criteria met
- [ ] Unit, integration, and E2E tests passing
- [ ] Performance benchmarks met
- [ ] Documentation updated
- [ ] Mobile responsiveness validated

## Dependencies

- Story 31 (Create and Display User's Root Directory) completed
- Firebase Admin SDK configured
- Cloud Storage bucket configured
- Authentication system working
- mdx-editor integration available

## Success Metrics

### User Engagement

- Users create ≥1 note within first session
- Average session time >10 minutes
- Note creation completion rate >90%
- User retention after first week >70%

### Technical Performance

- Note creation time <3 seconds
- Auto-save latency <1 second
- Note list loading time <2 seconds
- Error rate <1%
- Zero data loss incidents

### Cost Tracking

- Average storage cost per note <$0.001
- API call efficiency (minimize unnecessary calls)
- Cloud Storage bandwidth usage

## Notes

**Full-Stack Story Philosophy**: This story delivers complete note-taking functionality from UI to storage. Users can
immediately start creating and managing their study notes, experiencing the full value of the application.

**"Scooter" Enhancement**: This builds upon the workspace foundation from Story 31, adding complete note functionality.
Users now have a fully working note-taking application.

**Auto-Save Strategy**: Implements debounced auto-save to prevent data loss while minimizing API calls and costs.

**Future Growth**: This establishes the pattern for all content types and creates the foundation for advanced features
like search, tags, and collaboration. 
