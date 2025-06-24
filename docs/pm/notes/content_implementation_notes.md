# Content Implementation Notes

## Supported Content Types

We need to support the following types of content:

- Directories
- Notes
- Images
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

## Data Architecture

### Entity Versioning
- Entity versioning for easy migration
- Migration happens only when user accesses the application

### Content Versioning
- Content versioning to allow restoration of old versions

### Directory Structure Optimization

To make listing directory contents and moving directories more efficient:
- Do not store the content path or depth
- Each content should have a list of its children

**TODO:** Remove this approach

### Storage Strategy

I don't think we need to store the content path or depth.

**Question:** Should we store only metadata on Firestore and contents on cloud storage?

**Requirements:**
- The solution must be cost effective
- Track each API call, number of queries performed, and amount of data transferred
- Consider a new entity "directory index" that should hold all the metadata for the directory and its immediate children

## Content Types Implementation

### Flashcard Decks

#### FlashcardDeck Structure
- **Flashcard**
  - Content (front/back): Markdown with attachments
  - Start/end time for tracking the total time taken to answer
  - Timeout for defining a maximum total time to answer
- **ReversedFlashcard**
  - Do not have contents, only a reference to flashcard

**Decision needed:** Store flashcards in specific content or inside card decks?

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

### Notes

**Format:** Markdown

**Editor options:**
- https://github.com/mdx-editor/editor
- https://www.wysimark.com/

### Attachments

Notes, images, and other contents may have the following as attachments:
- Flashcard decks
- Images
- Quizzes
- Other notes

## System Features

### Virtual File System
- Local cache
- Local indexing for search

### Tags System

Tag names with optional values.

#### Tag Types
- **System tags:**
  - Content root
  - Knowledge area
- **User defined tags:**

### Favorites
- Support for marking content as favorites

### Content Sharing

**Current scope:** Sharing content with other users
- For now, only the owner will be able to change contents
- Study tracking must be separated from the flashcard
