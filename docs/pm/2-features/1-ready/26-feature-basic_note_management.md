# Feature 26: Basic Note Management (Iteration 1 - Scooter)

## Feature Summary

Implement a complete, working note-taking solution that allows users to create, edit, and organize study notes in a single root directory ("My Contents"). This represents the "scooter" iteration - a fully functional solution that provides immediate value.

## Business Value

**Core User Need**: Users need a simple way to create, edit, and organize their study notes digitally.

**Value Proposition**: Users can immediately start taking notes in a structured environment, replacing scattered text files or paper notes with a centralized digital solution.

**Iteration Philosophy**: Complete working solution (scooter) rather than incomplete complex system.

## Feature Scope

### ✅ Included in This Feature

1. **Single Root Directory ("My Contents")**
   - Automatically created for each authenticated user
   - Acts as entry point for all user content
   - Simple navigation starting point

2. **Basic Notes Management**
   - Create new notes with title and markdown content
   - Edit existing notes with visual markdown editor
   - Delete notes with confirmation
   - List all notes in root directory

3. **Simple Virtual File System**
   - Basic content listing and navigation
   - Simple CRUD operations for notes
   - Basic error handling and loading states
   - Content persistence and reliability

4. **Essential User Experience Features**
   - Simple user onboarding (empty state with helpful messaging)
   - Basic content validation (title required, content size limits)
   - Simple navigation between content list and editor
   - Basic responsive design for mobile devices

### ❌ Explicitly Excluded (Future Features)

- Individual flashcards → Feature 27
- Child directories/folders → Feature 28
- Flashcard decks and attachments → Feature 29
- Tags and search → Feature 30
- Advanced editor features (LaTeX, syntax highlighting)
- Offline capabilities

## Technical Architecture

### Data Model

**User Root Directory (Firestore)**
```typescript
{
  id: "root_user_123",
  name: "My Contents",
  type: "directory",
  parentId: null, // Root directory
  ownerId: "user_123",
  createdAt: timestamp,
  updatedAt: timestamp
}
```

**Note Metadata (Firestore)**
```typescript
{
  id: "note_456",
  name: "Study Notes - Chapter 1",
  type: "note",
  parentId: "root_user_123",
  ownerId: "user_123",
  contentUrl: "gs://sapie-content/user_123/notes/note_456.md",
  size: 2048, // bytes
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### Storage Strategy

- **Firestore**: Metadata only (fast queries, low cost)
- **Cloud Storage**: Actual content (1000x cheaper storage)
- **Access**: Signed URLs for secure content delivery
- **Caching**: Aggressive client-side caching

### API Endpoints

```typescript
GET /api/content/root              // Get user's root directory
GET /api/content/:id/children      // List directory contents  
GET /api/content/:id               // Get content metadata
POST /api/content                  // Create new content
PUT /api/content/:id               // Update content
DELETE /api/content/:id            // Delete content
GET /api/content/:id/download      // Get signed URL for content
```

### Frontend Components (React)

```
src/pages/
├── ContentPage.tsx            // Main content management page
└── NoteEditorPage.tsx         // Note editing page

src/components/content/
├── ContentList.tsx            // List of notes in directory
├── NoteCard.tsx              // Individual note preview
├── NoteEditor.tsx            // Markdown editor component
├── CreateNoteModal.tsx       // Modal for creating new notes
└── DeleteConfirmModal.tsx    // Confirmation for deletions

src/hooks/
├── useContent.ts             // Content CRUD operations
├── useContentList.ts         // Directory content listing
└── useNoteEditor.ts          // Note editing state management

src/lib/content/
├── content-service.ts        // API client for content operations
├── content-cache.ts          // Client-side content caching
└── types.ts                  // TypeScript type definitions
```

## User Experience Flow

### First Time User
1. User logs in → Root directory automatically created
2. User sees empty "My Contents" with "Create Note" button
3. User clicks "Create Note" → Modal opens
4. User enters title → Note created, editor opens
5. User writes content → Auto-saves
6. User returns to directory → Sees note listed

### Returning User
1. User logs in → Loads "My Contents" directory
2. User sees list of notes with previews
3. User clicks note → Opens editor
4. User makes changes → Auto-saves
5. User can delete with confirmation

### Core Operations
- **Create**: Title input → Editor → Auto-save
- **Read**: Click note → Load from cache/Cloud Storage
- **Update**: Edit in place → Auto-save
- **Delete**: Delete button → Confirmation → Remove from both stores

## Implementation Plan

### Phase 1: Backend Foundation (API Package)
1. **Basic Content Storage**
   - Simple Content entity with Firestore integration
   - Basic Cloud Storage service for markdown files
   - Root directory auto-creation service
   - Authentication middleware for content endpoints

2. **Simple Content API**
   - Core RESTful endpoints (CRUD operations)
   - Basic error handling and validation

### Phase 2: Frontend Foundation (Web Package)
1. **Content Service Layer**
   - Simple API client for content operations
   - Basic TypeScript type definitions
   - Simple content hooks (useContent, useContentList)

2. **Basic UI Components**
   - ContentPage for listing notes
   - Simple NoteCard component
   - CreateNoteModal for new notes
   - Basic delete functionality with confirmation

### Phase 3: Note Editor & Polish
1. **Simple Note Editor**
   - Integrate mdx-editor for markdown editing
   - Basic auto-save functionality
   - Navigation between list and editor
   - Basic loading states

2. **Final Polish**
   - Basic error handling and user feedback
   - Simple responsive design
   - E2E test for core user journey

## Stories Breakdown

This feature will be implemented through the following stories:

- **Story 31**: Implement Content Storage Foundation
- **Story 32**: Create Basic Content API
- **Story 33**: Build Content Management UI
- **Story 34**: Implement Note Editor
- **Story 35**: Add Content Operations (Delete, Validation)
- **Story 36**: Implement Auto-save and Polish

## Acceptance Criteria

### Functional Requirements
- [ ] Users can create notes with titles
- [ ] Users can edit notes with markdown editor
- [ ] Users can delete notes with confirmation
- [ ] Users can see list of all their notes
- [ ] Content auto-saves without user intervention
- [ ] Users always start in "My Contents" root directory

### Technical Requirements
- [ ] All content metadata stored in Firestore
- [ ] All content files stored in Cloud Storage
- [ ] Proper authentication on all endpoints
- [ ] Client-side caching for performance
- [ ] Comprehensive error handling
- [ ] TypeScript types for all entities

### Performance Requirements
- [ ] Content list loads in < 2 seconds
- [ ] Note editor opens in < 1 second
- [ ] Auto-save completes in < 3 seconds
- [ ] Graceful handling of network issues

## Dependencies

- User authentication system (completed)
- Firebase/Cloud Storage setup (completed)
- Basic React application structure (completed)

## Success Metrics

### User Engagement
- Number of notes created per user
- Time spent in editor per session
- Daily/weekly active users
- User retention after first week

### Technical Performance
- API response times
- Content loading performance
- Error rates and recovery
- Cost per user (Firestore + Cloud Storage)

### Cost Tracking
- Firestore read/write operations per user
- Cloud Storage usage per user
- API call volume
- Total cost per active user

### Specific Targets
- Users create ≥3 notes within first week
- Average session time >10 minutes
- User retention >60% after first week
- Zero data loss incidents
- Cost per user <$0.10/month

## Technical Decisions

### Editor Choice
**Decision**: Use mdx-editor for markdown editing
- **Rationale**: Open source, more customizable, cost-effective
- **Alternative**: wysimark (commercial, more polished out-of-box)

### Auto-save Strategy
**Decision**: Implement debounced auto-save (3-second delay)
- Saves user changes automatically
- Prevents excessive API calls
- Shows save status to user

### Error Handling
**Decision**: Graceful degradation approach
- Cache content locally when possible
- Show clear error messages
- Provide retry mechanisms
- Never lose user content

## Risk Mitigation

### Technical Risks
- **Editor integration complexity**: Start with basic markdown, enhance gradually
- **Auto-save performance**: Implement debouncing and local caching
- **Content loading performance**: Aggressive caching + loading states

### User Experience Risks
- **Learning curve**: Simple, intuitive interface with clear actions
- **Data loss fears**: Visible auto-save indicators + reliable error handling
- **Empty state confusion**: Clear onboarding flow with helpful empty states

## Definition of Done

- All acceptance criteria met
- All stories completed and tested
- E2E test covers complete user journey
- Performance benchmarks achieved
- Documentation updated
- Code review completed 