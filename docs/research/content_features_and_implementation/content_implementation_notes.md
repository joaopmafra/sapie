# Content Implementation Notes

## Supported Content Types

We need to support the following types of content:

- Directories
- Notes
- Images
- Excalidraw drawings (only in a future version)
- Flashcards
- Quizzes
- PDFs (only in a future version)
- Audio files (only in a future version)

## Technical Constraints

### Firestore Limitations

**Maximum document length:** 1 MiB (1,048,576 bytes)
- Reference: https://firebase.google.com/docs/firestore/quotas
- For now, don't allow notes/flashcards/quizzes bigger than that
- In the future we must find a way to support bigger documents

### Performance Considerations

- **Lazy loading:** Load content on-demand to improve initial page load times
- **Caching strategy:** Implement aggressive caching for frequently accessed content
- ~~**Image optimization:** Compress and resize images automatically~~
- **Content indexing:** Build efficient search indexes for quick content discovery

## Data Architecture

### Content Hierarchy

**Content entities:**
- All content types inherit from a base `Content` entity
- Each content has: `id`, `name`, `type`, `parentId`, `createdAt`, `updatedAt`, `ownerId`
- Directory traversal through parent-child relationships

### Study Tracking

- Study tracking must be separated from the flashcard and quizzes to allow multiple users to study the same content

### Entity Versioning
- Entity versioning for easy migration
- Migration happens only when users access the application
- Version compatibility matrix to handle breaking changes

### Content Versioning
- Content versioning to allow restoration of old versions
- Keep last N versions (configurable, default: 10)
- Automatic cleanup of old versions after retention period
- Support for version comparison and diff visualization

### Storage Strategy

**Question:** Should we store the content path or depth? I don't think this is needed since the content will be cached
in the client and fetching by id will be fast.

**Requirements:**
- The solution must be cost-effective
- Track each API call, number of Firestore queries performed, Cloud Storage calls, and amount of data transferred
- Consider a new entity "directory index" that should hold all the metadata for the directory and its immediate children
- The goal is to be able to measure the cost per user

**Decision: Cloud Storage + Firestore Metadata**

**Storage Architecture:**
- **Firestore**: Store all metadata (id, name, type, parentId, createdAt, updatedAt, ownerId, contentUrl, size, etc.)
- **Cloud Storage**: Store actual content (markdown, images, etc.) and generate signed URLs for access
- **Benefits**: 1000x cheaper storage costs, no size limitations, simple implementation, efficient metadata queries

**Implementation:**
- Each content document in Firestore contains metadata + `contentUrl` pointing to Cloud Storage
- Content uploaded to Cloud Storage with structured paths: `/{ownerId}/{contentType}/{contentId}`
- Use Cloud Storage signed URLs for secure, cacheable content access
- Lazy load content from Cloud Storage URLs when needed

Look at the storage_solution_decision.md file for more details.

## Content Types Implementation

### Directories

**Structure:**
- Name and description
- Permissions and sharing settings
- Custom organization options (sort order, view type) (only in future versions)

### Notes

**Format:** Markdown with rich media support

**Features:**
- We will allow only visual editing (no markdown code editing)
- Syntax highlighting for code blocks
- Mathematical equation support (LaTeX) (only in future versions)
- Auto-save functionality

**Editor options:**
- https://github.com/mdx-editor/editor
- https://www.wysimark.com/

### Images

**Supported formats:** JPEG, PNG, GIF, WebP, SVG
**Features:**
- Automatic thumbnail generation
- Multiple resolution support
- Alt text for accessibility
- ~~Image metadata extraction (EXIF)~~
- Compression and optimization

### Excalidraw drawing

https://github.com/excalidraw/excalidraw

Only in a future version.

### Flashcards

#### Flashcards Structure

- **Flashcard**
  - Content (front/back): Markdown with attachments
  - Start/end time for tracking the total time taken to answer
  - Timeout for defining a maximum total time to answer
  - Difficulty rating
  - Learning statistics
- **ReversedFlashcard**
  - Do not have contents, only a reference to flashcard
- When designing the data model, consider the atributes that will be used for the spaced repetition algorithm

#### Flashcard Decks Structure

- Name and description
- Permissions and sharing settings
- Custom organization options (sort order, view type)
- Should have references to flashcards

#### Spaced Repetition Algorithm

**Primary option:**
- https://github.com/open-spaced-repetition/ts-fsrs 
- Example: https://open-spaced-repetition.github.io/ts-fsrs/example

**Alternative options:**
- https://github.com/VienDinhCom/supermemo
- https://github.com/yodaiken/dolphinsr
- https://github.com/open-spaced-repetition
- https://github.com/RickCarlino/femto-fsrs
- [Google search results](https://www.google.com/search?q=spaced+repetition+algorithm+javascript)

### Quizzes (only in a future version)

**Question types:**
- Multiple choice
- True/false
- Fill in the blank
- Short answer
- ~~Essay questions~~ won't be supported for now

**Features:**
- Randomized question order
- Time limits
- Immediate feedback
- Score tracking
- ~~Detailed analytics~~

### Attachments

Notes, images, and other contents may have the following as attachments:
- Flashcard decks
- Images
- Quizzes
- Other notes
- External links with preview generation
- TODO: specify the supported types of attachments for each content type

## System Features

### Search and Discovery

**Full-text search capabilities:**
- Search across all content types
- Advanced search filters (date, type, tags, owner)
- Search result ranking and relevance
- Search suggestions and autocomplete
- Recent searches history

**Indexing strategy:**
-Searching and indexing must be done in the client side for now
  - https://github.com/nextapps-de/flexsearch
  - https://www.google.com/search?q=js+full+text+search+library
- Real-time content indexing
- Faceted search support
- In future versions, we will use a search service like Algolia or Elasticsearch

### Virtual File System
- Local cache with intelligent invalidation
- Local indexing for offline search
- ~~Conflict resolution for offline changes~~ we won't support offline mode for now
- ~~Sync status indicators~~ we won't support offline mode for now

### Tags System

Tag names with optional values.

#### Tag Types
- **System tags:**
  - Content root
  - Knowledge area
  - Knowledge level (beginner, intermediate, advanced)
  - Base principles / axioms
- **User defined tags:**
  - e.g.: custom categories, priority levels, status indicators, etc.

**Tag management:**
- Tag autocomplete and suggestions
- Tag renaming and merging
- Bulk tag operations

### Favorites
- Support for marking content as favorites (notes, cards, quizzes, etc.)
- Mark content as "to review"
- Quick access to favorite content

### Focus mode

- Focus mode is a mode that allows the user to focus on a single content root

### Study

- Study is a mode that allows the user to study a single directory, including or not its children

### View modes

- The user may want not to show a note's content, only information like title, tags, attachments, etc.
- This can be selected per directory, note, or other content types, and optionally be applied to all children

### Content Sharing

**Current scope:** Sharing content with other users
- For now, only the owner will be able to change contents

**Sharing methods:**
- Direct user sharing

## Security and Privacy

TODO

## Gamification

- Badges
- Allow users to compete with each other
- etc.

### User preferences

- Default view modes
- Don't ask again
- etc.

### AI features

- AI-powered content creation
- Generate notes from pdf's
- Generate flashcards from notes
- AI-powered chat with the content
- etc.

### Data Protection
- Encryption at rest and in transit
- Personal data anonymization options
- GDPR compliance features
- Deletion capabilities

### Content Security
- Input validation and sanitization
- XSS protection for user-generated content
- File type validation and scanning
- Rate limiting to prevent abuse (only in a future version)

## User Experience

### Content Creation
- Drag-and-drop file uploads (only in a future version)
- Bulk import capabilities (only in a future version)

### Content Organization
- Multiple organization methods (folders, tags, favorites)
- Custom sorting options
- View customization (list, grid, timeline) (only in a future version)

### Responsive Design
- Mobile-first approach
- Touch-friendly interfaces
- ~~Offline capability indicators~~ we won't support offline mode for now
- Progressive web app features

## API Design

### RESTful Endpoints
- Consistent naming conventions
- Proper HTTP status codes
- Comprehensive error handling
- Rate limiting and throttling

## Analytics and Monitoring

### Content Analytics
- Popular content identification
- User engagement metrics
- Learning progress tracking

### System Monitoring
- Performance metrics
- Error tracking and alerting
- Resource usage monitoring
- User behavior analytics

### Cost Optimization
- Storage cost tracking
- API usage monitoring
- Automated cost alerts
- Resource optimization recommendations

## Testing Strategy

### Unit Testing
- Content validation logic
- Business rule enforcement
- Data transformation functions
- Error handling scenarios
- Virtual file system

### Integration Testing
- API endpoint testing
- Database interaction testing
- File upload and storage testing
- Authentication and authorization testing

### End-to-End Testing
- User workflow testing
- Cross-browser compatibility
- Mobile device testing

## Problems to solve

### Missing Data Validation Strategy
**Problem**: No mention of input validation, sanitization, or content security policies.
**Improvement**:
- Define validation rules for each content type
- Specify sanitization procedures for user-generated content
- Add XSS and injection attack prevention measures

### Incomplete Cost Analysis
**Problem**: The doc mentions cost optimization but lacks concrete metrics or budgets.
**Improvement**:
- Define specific cost targets per user
- Implement detailed cost tracking and alerting
- Create cost optimization decision tree

