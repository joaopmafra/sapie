# Content Features - First Iteration Plan

## Overview

This document outlines the first iteration of content features implementation following the **iterative development
approach** (scooter → bicycle → motorcycle → car). This iteration represents the "scooter" - a complete, working
solution that provides immediate value to users.

## Iteration Goals

**Core User Need**: Users need a simple way to create, edit, and organize their study notes digitally.

**Value Proposition**: Users can immediately start taking notes in a structured environment, replacing scattered text
files or paper notes with a centralized digital solution.

## Scope Definition

### ✅ Included in This Iteration

1. **Single Root Directory ("My Contents")**
    - Automatically created for each authenticated user
    - Acts as the entry point for all user content
    - Simple navigation starting point

2. **Basic Notes Management**
    - Create new notes with title and markdown content
    - Edit existing notes with visual markdown editor
    - Delete notes with confirmation
    - List all notes in the root directory

3. **Simple Virtual File System**
   - Basic content listing and navigation
   - Simple CRUD operations for notes
   - Basic error handling and loading states
   - Content persistence and reliability

4. **Additional Important Features for First Iteration**
   - Simple user onboarding (empty state with helpful messaging)
   - Basic content validation (title required, content size limits)
   - Simple navigation between content list and editor
   - Basic responsive design for mobile devices

### ❌ Explicitly Excluded (Future Iterations)

- Individual flashcards - Iteration 2
- Child directories/folders - Iteration 3  
- Flashcard decks and attachments - Iteration 4
- Tags and search - Iteration 5
- Advanced features (sharing, versioning, spaced repetition)
- Offline capabilities
- Advanced editor features (LaTeX, syntax highlighting)

## Technical Architecture

### Data Model

**User Root Directory (Firestore)**

```typescript
{
    id: "root_user_123",
        name
:
    "My Contents",
        type
:
    "directory",
        parentId
:
    null, // Root directory
        ownerId
:
    "user_123",
        createdAt
:
    timestamp,
        updatedAt
:
    timestamp
}
```

**Note Metadata (Firestore)**

```typescript
{
    id: "note_456",
        name
:
    "Study Notes - Chapter 1",
        type
:
    "note",
        parentId
:
    "root_user_123",
        ownerId
:
    "user_123",
        contentUrl
:
    "gs://sapie-content/user_123/notes/note_456.md",
        size
:
    2048, // bytes
        createdAt
:
    timestamp,
        updatedAt
:
    timestamp
}
```

**Note Content (Cloud Storage)**

- Stored as markdown files in Cloud Storage
- Path: `/user_123/notes/note_456.md`
- Accessed via signed URLs

### Storage Strategy

Following the **Cloud Storage + Firestore metadata** decision:

- **Firestore**: Metadata only (fast queries, low cost)
- **Cloud Storage**: Actual content (1000x cheaper storage)
- **Access**: Signed URLs for secure content delivery
- **Caching**: Aggressive client-side caching of both metadata and content

### API Endpoints (NestJS)

```typescript
// Content Controller
GET / api / content / root           // Get user's root directory
GET / api / content /
:
id / children   // List directory contents  
GET / api / content /
:
id            // Get content metadata
POST / api / content               // Create new content
PUT / api / content /
:
id            // Update content
DELETE / api / content /
:
id         // Delete content
GET / api / content /
:
id / download   // Get signed URL for content
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

### 1. First Time User

1. User logs in → Root directory automatically created
2. User sees empty "My Contents" directory with "Create Note" button
3. User clicks "Create Note" → Modal opens with title input
4. User enters title → Note created and editor opens
5. User writes content → Auto-saves to Cloud Storage
6. User returns to directory → Sees note listed

### 2. Returning User

1. User logs in → Loads "My Contents" directory
2. User sees list of existing notes with previews
3. User clicks note → Opens editor
4. User makes changes → Auto-saves
5. User can delete notes with confirmation

### 3. Core Operations

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

## Success Criteria

### Functional Requirements

- [x] Users can create notes with titles
- [x] Users can edit notes with markdown editor
- [x] Users can delete notes with confirmation
- [x] Users can see list of all their notes
- [x] Content auto-saves without user intervention
- [x] Users always start in "My Contents" root directory

### Technical Requirements

- [x] All content metadata stored in Firestore
- [x] All content files stored in Cloud Storage
- [x] Proper authentication on all endpoints
- [x] Client-side caching for performance
- [x] Comprehensive error handling
- [x] TypeScript types for all entities

### Performance Requirements

- [x] Content list loads in < 2 seconds
- [x] Note editor opens in < 1 second
- [x] Auto-save completes in < 3 seconds
- [x] Graceful handling of network issues

## Future Iterations Preview

### Iteration 2: Individual Flashcards & Simple Study
- Individual flashcards in root directory
- Simple study feature (front/back, no tracking)
- Basic flashcard CRUD operations
- Simple study interface with show/hide back

### Iteration 3: Directory Structure
- Child directories/folders
- Ability to add notes and flashcards to child directories
- Basic folder navigation
- Move content between directories

### Iteration 4: Flashcard Decks & Attachments
- Flashcard decks (collections of flashcards)
- Attachments to content (images, files)
- Deck management and organization
- Rich content attachments

### Iteration 5: Search & Organization
- Tags system for content organization
- Full-text search across all content
- Advanced filtering and organization
- Search within directories and content types

### Future Advanced Features
- Spaced repetition algorithm for flashcards
- Content sharing and collaboration
- Advanced editor features (LaTeX, syntax highlighting)
- Content versioning and history
- AI-powered features (content generation, chat)
- Gamification and progress tracking
- Export/import capabilities
- Offline mode and sync

## Questions & Decisions

### Editor Choice

**Decision Needed**: Choose between mdx-editor and wysimark

- **mdx-editor**: Open source, more customizable
- **wysimark**: Commercial, more polished out-of-box

**Recommendation**: Start with mdx-editor for cost and flexibility

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

## Measurement & Success Metrics

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

This first iteration provides a complete, working note-taking solution that users can immediately benefit from, while
establishing the foundation for all future content features.
