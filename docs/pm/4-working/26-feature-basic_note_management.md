# Feature 26: Basic Note Management (Iteration 1 - Scooter)

## Feature Summary

Implement a complete, working note-taking solution that allows users to create, edit, and organize study notes in a single root directory ("My Contents"). This represents the "scooter" iteration - a fully functional solution that provides immediate value through **full-stack stories** that deliver complete user workflows.

## Business Value

**Core User Need**: Users need a simple way to create, edit, and organize their study notes digitally.

**Value Proposition**: Users can immediately start taking notes in a structured environment, replacing scattered text files or paper notes with a centralized digital solution.

**Iteration Philosophy**: Complete working solution (scooter) delivered through full-stack stories rather than incomplete separate backend/frontend implementations.

## Feature Scope

### ✅ Included in This Feature

1. **Complete Root Directory Workflow**
   - Automatically created "My Contents" directory for each authenticated user
   - Full-stack implementation: backend storage + frontend display
   - Users see their personal workspace immediately upon login
   - Foundation for all content management

2. **Complete Note Management Workflow**
   - Create new notes with title and markdown content (full UI to storage)
   - Edit existing notes with visual markdown editor and auto-save
   - Delete notes with confirmation modal
   - List all notes with previews and management options
   - End-to-end note-taking experience

3. **Essential User Experience Features**
   - Simple user onboarding with helpful empty states
   - Basic content validation (title required, content size limits)
   - Intuitive navigation between content list and editor
   - Responsive design for mobile devices
   - Clear loading states and error handling

### ❌ Explicitly Excluded (Future Features)

- Individual flashcards → Feature 27
- Child directories/folders → Feature 28
- Flashcard decks and spaced repetition → Feature 29
- Tags and search → Feature 30
- Advanced editor features (LaTeX, syntax highlighting)
- Offline capabilities

## Technical Architecture

### Full-Stack Story Approach

Rather than splitting backend and frontend into separate stories, this feature implements complete user workflows through full-stack stories:

- **Immediate User Value**: Users can accomplish real tasks upon each story completion
- **End-to-End Testing**: Complete workflows can be tested and validated immediately
- **Faster Feedback**: Users experience the full feature immediately
- **Reduced Coordination**: No waiting for backend/frontend story dependencies

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
// Root directory management
GET /api/content/root              // Get or create user's root directory

// Note CRUD operations
POST /api/content                  // Create new note
GET /api/content/:id               // Get note metadata
PUT /api/content/:id               // Update note
DELETE /api/content/:id            // Delete note
GET /api/content/:id/download      // Get signed URL for note content
GET /api/content/:id/children      // List notes in directory
```

### Frontend Architecture

```
src/pages/
├── ContentWorkspacePage.tsx      // Main content management page
└── NoteEditorPage.tsx             // Note editing page

src/components/content/
├── NoteList.tsx                   // List of notes in directory
├── NoteCard.tsx                   // Individual note preview
├── NoteEditor.tsx                 // Markdown editor component
├── CreateNoteModal.tsx            // Modal for creating new notes
└── DeleteConfirmModal.tsx         // Confirmation for deletions

src/hooks/
├── useContent.ts                  // Content CRUD operations
├── useContentList.ts              // Directory content listing
└── useNoteEditor.ts               // Note editing state management

src/lib/content/
├── content-service.ts             // API client for content operations
├── content-cache.ts               // Client-side content caching
└── types.ts                       // TypeScript type definitions
```

## User Experience Flow

### First Time User
1. **User logs in** → Authentication completes
2. **Story 31 delivers**: User immediately sees "My Contents" directory
3. **User clicks "Create Note"** → CreateNoteModal opens
4. **User enters title** → Note created, editor opens automatically
5. **Story 32 delivers**: User can immediately start typing and see auto-save
6. **User returns to workspace** → Sees note listed with preview

### Returning User
1. **User logs in** → Loads "My Contents" directory with existing notes
2. **User sees note list** → All notes displayed with previews and metadata
3. **User clicks note** → Editor opens with content loaded
4. **User edits content** → Auto-saves every 3 seconds with visual feedback
5. **User can manage notes** → Delete with confirmation, organize by titles

### Complete User Workflows
- **Create Workflow**: Click Create → Enter Title → Start Typing → Auto-save
- **Edit Workflow**: Click Note → Edit Content → See Save Status → Auto-save
- **Manage Workflow**: View List → See Previews → Delete with Confirmation
- **Navigate Workflow**: Workspace ↔ Editor with clear breadcrumbs

## Full-Stack Story Implementation

### Story 31: Create and Display User's Root Directory
**User Value**: Users see their personal workspace immediately upon login
**Implementation**: Complete workflow from authentication to workspace display
- **Backend**: Root directory creation, Firestore integration, API endpoint
- **Frontend**: Content workspace page, authentication integration, navigation
- **Complete Workflow**: Login → See "My Contents" → Ready to create content

### Story 32: Create and Edit Notes
**User Value**: Users can immediately start taking and managing notes
**Implementation**: Complete note-taking experience from creation to management
- **Backend**: Cloud Storage, metadata service, complete CRUD API
- **Frontend**: Note creation modal, markdown editor, note list, auto-save
- **Complete Workflow**: Create Note → Edit Content → Auto-save → Manage Notes

## Acceptance Criteria

### Functional Requirements
- [ ] Users can see their personal "My Contents" workspace upon login
- [ ] Users can create notes with titles and markdown content
- [ ] Users can edit notes with live auto-save and visual feedback
- [ ] Users can delete notes with confirmation to prevent accidents
- [ ] Users can see list of all their notes with helpful previews
- [ ] Content persists reliably across sessions and devices

### Technical Requirements
- [ ] All content metadata stored in Firestore for fast queries
- [ ] All content files stored in Cloud Storage for cost efficiency
- [ ] Proper authentication enforced on all endpoints
- [ ] Client-side caching for improved performance
- [ ] Comprehensive error handling across full stack
- [ ] TypeScript types consistent between backend and frontend

### Performance Requirements
- [ ] Content workspace loads in < 2 seconds
- [ ] Note editor opens in < 1 second
- [ ] Auto-save completes in < 3 seconds
- [ ] Graceful handling of network issues
- [ ] Responsive design works smoothly on mobile

### User Experience Requirements
- [ ] Intuitive navigation between workspace and editor
- [ ] Clear visual feedback for all operations
- [ ] Helpful empty states for new users
- [ ] Error messages are user-friendly and actionable
- [ ] Mobile-responsive design for on-the-go use

## Dependencies

- User authentication system (completed)
- Firebase/Cloud Storage setup (completed)
- Basic React application structure (completed)

## Success Metrics

### User Engagement
- Number of notes created per user in first week: Target ≥3
- Time spent in editor per session: Target >10 minutes
- Daily/weekly active users: Growing retention curve
- User retention after first week: Target >70%
- Note creation completion rate: Target >90%

### Technical Performance
- API response times: <500ms for metadata, <2s for content
- Content loading performance: <2s for workspace, <1s for editor
- Error rates and recovery: <1% error rate, 100% recovery
- Auto-save reliability: Zero data loss incidents
- Cost per user: <$0.10/month including storage and API calls

### User Satisfaction
- Task completion rates: >90% for core workflows
- User feedback sentiment: Positive on note-taking experience
- Support ticket volume: Minimal confusion or issues
- Feature adoption: >80% of users create multiple notes

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
- Never lose user content

### Full-Stack Implementation
**Decision**: Implement complete user workflows in single stories
- **Rationale**: Immediate user value, faster feedback, reduced coordination
- **Benefits**: Complete testing, clear success criteria, early validation

## Risk Mitigation

### Technical Risks
- **Editor integration complexity**: Start with basic mdx-editor, enhance gradually
- **Auto-save performance**: Implement debouncing and local caching
- **Full-stack complexity**: Focus on simple, working solutions first
- **Content loading performance**: Aggressive caching + loading states

### User Experience Risks
- **Learning curve**: Simple, intuitive interface with clear actions
- **Data loss fears**: Visible auto-save indicators + reliable error handling
- **Empty state confusion**: Clear onboarding flow with helpful guidance
- **Feature overload**: Progressive disclosure, start simple

### Implementation Risks
- **Story scope creep**: Maintain focus on complete but simple workflows
- **Backend/frontend integration**: Use shared TypeScript types and clear contracts
- **Performance degradation**: Monitor and optimize throughout development
- **Authentication complexity**: Leverage existing auth infrastructure

## Definition of Done

- All acceptance criteria met
- All stories completed with full-stack implementation
- Complete user workflows tested end-to-end
- Performance benchmarks achieved
- User experience validated
- Documentation updated
- Code review completed
- Mobile responsiveness validated

## Full-Stack Story Benefits

This feature demonstrates the power of the full-stack story approach:

1. **Immediate User Value**: Each story delivers complete functionality users can immediately benefit from
2. **Reduced Risk**: Complete workflows are tested and validated early
3. **Better User Feedback**: Users experience the full feature immediately
4. **Faster Development**: No coordination overhead between backend/frontend stories
5. **Clear Success Criteria**: Complete user workflows are easily measurable

**Result**: Users get a complete, working note-taking application that they can use productively, rather than waiting for multiple partial implementations to come together. 