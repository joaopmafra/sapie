# Research: Content Implementation

## Overview

This document outlines an approach to implementing the contents feature in the project.

## What we need

The contents feature is a core feature of the project. It is a way to store and display some types of contents in a 
structured format, organized in a tree structure like a file system.

There are some types of contents that we need to support:

- Directories
- Notes
- Images
- Flashcards
- Quizzes
- PDFs (only in a future version)

All the above contents should fit in a data model based on Google Firestore and Google Cloud Storage.

In addition, we need to implement a spaced repetition system to help the user learn the contents.

## Implementation details

### Design Decisions

This section outlines the key architectural decisions made in designing the content management system and the reasoning behind each choice.

#### 1. Single Collection with Discriminated Union Pattern

**Decision**: Store all content types in a single Firestore collection using a discriminated union pattern.

**Rationale**:
- **Query Efficiency**: Allows querying across all content types in a single operation (e.g., "show me all content in this folder")
- **Consistent Metadata**: All content shares common fields like hierarchy, timestamps, and learning data
- **Simplified Relationships**: Parent-child relationships work uniformly across all content types
- **Future Extensibility**: Easy to add new content types without schema migrations

**Trade-offs**:
- Slightly larger document size due to optional fields
- Need for proper TypeScript discriminated unions for type safety
- More complex validation logic

**Alternative Considered**: Separate collections per content type
- **Rejected because**: Would require complex cross-collection queries and relationship management

#### 2. Materialized Path Pattern for Hierarchy

**Decision**: Store the full path string alongside parentId for hierarchical organization.

**Rationale**:
- **Efficient Subtree Queries**: Can query all descendants with a simple string prefix match
- **Path-based Lookups**: Direct content access by path (e.g., `/my-courses/math/algebra`)
- **Breadcrumb Generation**: Easy to generate navigation breadcrumbs from the path
- **Depth Queries**: Can limit queries to specific depth levels

**Trade-offs**:
- Path updates require updating all descendants (mitigated by infrequent moves)
- Slightly more storage per document
- Path length limitations (manageable with reasonable nesting)

**Alternatives Considered**:
- **Adjacency List Only**: Would require recursive queries for descendants
- **Nested Sets**: Complex to maintain with frequent updates
- **Closure Table**: Separate collection overhead

#### 3. Integrated Spaced Repetition System

**Decision**: Include learning metadata directly in the base content document.

**Rationale**:
- **Atomic Updates**: Learning progress and content updates happen together
- **Simplified Queries**: Single query to get content with learning status
- **Consistent Data**: No risk of orphaned learning records
- **Performance**: Reduces the number of database reads

**Trade-offs**:
- Larger document size for non-learnable content (mitigated by optional field)
- All content documents include learning schema

**Alternative Considered**: Separate `learning_progress` collection
- **Rejected because**: Would require joins and could lead to data inconsistency

#### 4. File Separation Strategy

**Decision**: Store file metadata in Firestore and actual files in Cloud Storage.

**Rationale**:
- **Cost Optimization**: Firestore is expensive for large binary data
- **Performance**: Cloud Storage is optimized for file serving
- **CDN Integration**: Easy to serve files through CDN
- **Bandwidth**: Files don't count against Firestore bandwidth limits
- **Scalability**: Cloud Storage scales independently

**Implementation Details**:
- FileReference interface contains all necessary metadata
- Temporary signed URLs for secure access
- MD5 hashes for integrity verification

#### 5. Flexible Content Data Structure

**Decision**: Use a discriminated union for content-specific data with a `type` field discriminator.

**Rationale**:
- **Type Safety**: TypeScript can properly type-check content-specific fields
- **Validation**: Can validate content based on its type
- **Extensibility**: Easy to add new content types with their own data structure
- **Storage Efficiency**: Only stores relevant fields for each content type

**Example Benefits**:
```typescript
// TypeScript knows this is a FlashcardData
if (content.type === 'flashcard') {
  const front = content.data.front; // ✅ Type-safe access
  const back = content.data.back;   // ✅ Type-safe access
}
```

#### 6. Composite Indexing Strategy

**Decision**: Create composite indexes for common query patterns.

**Rationale**:
- **Query Performance**: Firestore requires indexes for multi-field queries
- **Cost Optimization**: Proper indexes reduce query execution time and cost
- **User Experience**: Fast queries enable responsive UI

**Key Indexes**:
- `userId + parentId + order`: For folder contents
- `userId + path`: For path-based lookups
- `userId + learning.nextReviewDate`: For spaced repetition
- `userId + type`: For content type filtering
- `userId + tags`: For tag-based searches

#### 7. User-Scoped Data Design

**Decision**: Include userId in all documents and queries.

**Rationale**:
- **Security**: Ensures users can only access their own content
- **Multi-tenancy**: Supports multiple users on the same database
- **Query Optimization**: Enables efficient user-scoped queries
- **Data Isolation**: Clear separation between user data

#### 8. Timestamp and Audit Strategy

**Decision**: Include comprehensive timestamp tracking (created, updated, accessed).

**Rationale**:
- **User Experience**: Show when content was last modified
- **Analytics**: Track usage patterns and popular content
- **Debugging**: Helps troubleshoot data issues
- **Spaced Repetition**: lastAccessedAt feeds into learning algorithms

#### 9. Slug-based URL Strategy

**Decision**: Include URL-friendly slugs alongside human-readable titles.

**Rationale**:
- **SEO**: Clean URLs for better search engine optimization
- **User Experience**: Readable URLs that indicate content
- **Routing**: Enables client-side routing with meaningful paths
- **Bookmarking**: Users can bookmark and share clean URLs

#### 10. Tag and Organization System

**Decision**: Implement a flexible tagging system with optional colors and favorites.

**Rationale**:
- **User Organization**: Multiple ways to organize content beyond folders
- **Search Enhancement**: Tags improve content discoverability
- **Visual Organization**: Colors provide visual cues for content types
- **Personalization**: Favorites allow quick access to important content

### Data model

The data model is designed around a flexible base `Content` entity with specialized types and support for hierarchical organization.

#### Base Content Entity (Firestore Collection: `contents`)

```typescript
interface BaseContent {
  id: string;                    // Firestore document ID
  userId: string;                // Owner of the content
  type: ContentType;             // Discriminator for content type
  title: string;                 // Display name
  slug: string;                  // URL-friendly identifier
  description?: string;          // Optional description
  
  // Hierarchical structure
  parentId: string | null;       // Parent content ID (null for root)
  path: string;                  // Full path from root (e.g., "/folder1/subfolder2")
  depth: number;                 // Depth in the tree (0 for root)
  order: number;                 // Sort order within parent
  
  // Metadata
  tags: string[];                // User-defined tags
  color?: string;                // Optional color for organization
  isFavorite: boolean;           // User favorite flag
  
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastAccessedAt?: Timestamp;
  
  // Content-specific data (discriminated union)
  data: ContentData;
  
  // Spaced repetition (for learnable content)
  learning?: LearningMetadata;
}

enum ContentType {
  DIRECTORY = 'directory',
  NOTE = 'note',
  IMAGE = 'image',
  FLASHCARD = 'flashcard',
  QUIZ = 'quiz',
  PDF = 'pdf'
}
```

#### Content-Specific Data Structures

```typescript
type ContentData = 
  | DirectoryData
  | NoteData
  | ImageData
  | FlashcardData
  | QuizData
  | PDFData;

interface DirectoryData {
  type: 'directory';
  // Directories don't need additional data beyond base content
}

interface NoteData {
  type: 'note';
  content: string;               // Markdown or rich text content
  contentType: 'markdown' | 'richtext';
  wordCount: number;
  readingTimeMinutes: number;
  attachments?: FileReference[]; // References to Cloud Storage files
}

interface ImageData {
  type: 'image';
  file: FileReference;           // Cloud Storage reference
  alt: string;                   // Alt text for accessibility
  caption?: string;
  dimensions?: {
    width: number;
    height: number;
  };
  metadata?: {
    camera?: string;
    location?: string;
    takenAt?: Timestamp;
  };
}

interface FlashcardData {
  type: 'flashcard';
  front: string;                 // Question/prompt
  back: string;                  // Answer/explanation
  cardType: 'basic' | 'cloze' | 'image';
  hints?: string[];
  difficulty: 1 | 2 | 3 | 4 | 5; // User-defined difficulty
  attachments?: FileReference[];
}

interface QuizData {
  type: 'quiz';
  questions: QuizQuestion[];
  timeLimit?: number;            // Minutes
  passingScore?: number;         // Percentage (0-100)
  allowRetries: boolean;
  shuffleQuestions: boolean;
  instructions?: string;
}

interface QuizQuestion {
  id: string;
  type: 'multiple_choice' | 'true_false' | 'short_answer' | 'essay';
  question: string;
  options?: string[];            // For multiple choice
  correctAnswers: string[];      // Can be multiple for complex questions
  explanation?: string;
  points: number;
  attachments?: FileReference[];
}

interface PDFData {
  type: 'pdf';
  file: FileReference;           // Cloud Storage reference
  pageCount: number;
  annotations?: PDFAnnotation[];
  bookmarks?: PDFBookmark[];
}

interface PDFAnnotation {
  id: string;
  page: number;
  type: 'highlight' | 'note' | 'bookmark';
  content: string;
  position: {
    x: number;
    y: number;
    width?: number;
    height?: number;
  };
  createdAt: Timestamp;
}

interface PDFBookmark {
  id: string;
  title: string;
  page: number;
  createdAt: Timestamp;
}
```

#### File References (Cloud Storage Integration)

```typescript
interface FileReference {
  bucket: string;                // Cloud Storage bucket name
  path: string;                  // File path in bucket
  filename: string;              // Original filename
  contentType: string;           // MIME type
  size: number;                  // File size in bytes
  md5Hash: string;               // For integrity verification
  downloadUrl?: string;          // Temporary download URL
  uploadedAt: Timestamp;
}
```

#### Spaced Repetition System

```typescript
interface LearningMetadata {
  isLearnable: boolean;          // Whether this supports spaced repetition
  
  // Spaced repetition algorithm data (SM-2 algorithm)
  easeFactor: number;            // Initial: 2.5
  interval: number;              // Days until next review
  repetitions: number;           // Number of successful reviews
  nextReviewDate: Timestamp;     // When to show next
  
  // Performance tracking
  totalReviews: number;
  correctReviews: number;
  accuracy: number;              // Percentage (0-100)
  averageResponseTime?: number;  // Milliseconds
  
  // Recent activity
  lastReviewDate?: Timestamp;
  lastReviewResult?: 'again' | 'hard' | 'good' | 'easy';
  reviewHistory: ReviewSession[];
}

interface ReviewSession {
  id: string;
  reviewedAt: Timestamp;
  result: 'again' | 'hard' | 'good' | 'easy';
  responseTimeMs: number;
  previousInterval: number;
  newInterval: number;
  previousEaseFactor: number;
  newEaseFactor: number;
}
```

#### Additional Collections

##### User Preferences (Collection: `user_preferences`)
```typescript
interface UserPreferences {
  userId: string;
  
  // Learning preferences
  dailyReviewLimit: number;      // Max reviews per day
  newContentLimit: number;       // Max new content per day
  reviewSchedule: {
    enabled: boolean;
    times: string[];             // Times of day for notifications
  };
  
  // Display preferences
  defaultView: 'list' | 'grid' | 'tree';
  contentPerPage: number;
  showLearningStats: boolean;
  
  // Content organization
  defaultTags: string[];
  autoGenerateTags: boolean;
  
  updatedAt: Timestamp;
}
```

##### Learning Statistics (Collection: `learning_stats`)
```typescript
interface LearningStats {
  userId: string;
  date: string;                  // YYYY-MM-DD format
  
  // Daily statistics
  reviewsCompleted: number;
  newContentStudied: number;
  studyTimeMinutes: number;
  accuracy: number;
  
  // Content type breakdown
  contentTypeStats: {
    [key in ContentType]?: {
      reviewed: number;
      accuracy: number;
      timeSpent: number;
    };
  };
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Virtual file system

The hierarchical structure is implemented using the `parentId`, `path`, and `depth` fields in the base content entity:

#### Key Design Decisions:

1. **Materialized Path Pattern**: Each content stores its full path for efficient querying
2. **Parent-Child Relationships**: `parentId` creates the tree structure
3. **Depth Tracking**: Enables efficient subtree queries
4. **Order Field**: Allows custom sorting within each directory

#### Query Patterns:

```typescript
// Get all children of a directory
const children = await db.collection('contents')
  .where('userId', '==', userId)
  .where('parentId', '==', directoryId)
  .orderBy('order')
  .get();

// Get all descendants of a directory (using path prefix)
const descendants = await db.collection('contents')
  .where('userId', '==', userId)
  .where('path', '>=', parentPath)
  .where('path', '<', parentPath + '\uf8ff')
  .get();

// Get content by path
const content = await db.collection('contents')
  .where('userId', '==', userId)
  .where('path', '==', '/my-folder/my-note')
  .limit(1)
  .get();

// Get all content due for review
const dueForReview = await db.collection('contents')
  .where('userId', '==', userId)
  .where('learning.isLearnable', '==', true)
  .where('learning.nextReviewDate', '<=', new Date())
  .orderBy('learning.nextReviewDate')
  .get();
```

#### Benefits of This Design:

1. **Flexibility**: Easy to add new content types by extending the discriminated union
2. **Performance**: Efficient querying with proper indexing
3. **Scalability**: Firestore's document-based structure scales well
4. **Extensibility**: Learning metadata can be added to any content type
5. **File Management**: Clean separation between metadata (Firestore) and files (Cloud Storage)
6. **Spaced Repetition**: Built-in SM-2 algorithm support with detailed tracking

#### Database Indexes Required:

```javascript
// Composite indexes for efficient queries
db.contents.createIndex({ userId: 1, parentId: 1, order: 1 });
db.contents.createIndex({ userId: 1, path: 1 });
db.contents.createIndex({ userId: 1, type: 1 });
db.contents.createIndex({ userId: 1, "learning.nextReviewDate": 1 });
db.contents.createIndex({ userId: 1, tags: 1 });
db.contents.createIndex({ userId: 1, updatedAt: -1 });
```

This data model provides a solid foundation for your content management system while maintaining flexibility for future enhancements.
