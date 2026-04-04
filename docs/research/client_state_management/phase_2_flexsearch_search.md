# Client State Management — Phase 2: FlexSearch In-Memory Search

## Table of Contents

- [Context & Decision](#context--decision)
- [Architecture Overview](#architecture-overview)
- [Index Schema](#index-schema)
- [Index Lifecycle](#index-lifecycle)
- [Implementation Plan](#implementation-plan)
- [File-by-File Changes](#file-by-file-changes)
- [Future Path to VFS](#future-path-to-vfs)

---

## Context & Decision

### The Problem

Full-text search is a core feature for a knowledge management tool used for active studying. Without it, finding a
specific note among hundreds requires remembering where it was filed — which defeats the purpose of the app.

The question is not *whether* to build search, but *where* the search index lives and *how* it is queried.

### What Was Considered

**External search service (Algolia, Elasticsearch, Typesense):** Provides the best query capability (fuzzy matching,
typo tolerance, faceting, ranking). However, it requires hosting costs, an additional service to configure and
authenticate, and transmitting note content to a third party. For a personal single-user tool, this is significant
overhead for a problem that can be solved entirely on the client.

**Firestore full-text search:** Firestore does not support full-text search natively. Workarounds (storing tokenized
arrays, using Firebase Extensions with Algolia/Typesense) require the same third-party service overhead as above.

**Virtual File System with persistent IndexedDB index:** A local-first architecture was considered where the search
index would be persisted in IndexedDB and synchronized with the backend. This would support offline search and faster
cold-start search (no re-indexing on page load). However, it requires write-sync machinery, conflict resolution, and
encryption at rest — none of which are needed until offline mode is implemented. The added complexity is not justified
by current requirements.

**In-memory FlexSearch index:** FlexSearch is an in-memory full-text search library with best-in-class performance
among JavaScript search libraries. The index is built in memory when content is loaded, and discarded when the page
is closed (rebuilt on next load). For a personal single-user tool:

- Even 5,000 notes at an average of 5KB of text each = 25MB of indexed content. FlexSearch's memory usage for this
  is under 50MB and query time is under 1ms.
- Re-indexing on load is fast — incremental indexing as content loads means there is no blocking "build index" step.
- No external service, no third-party data transmission, no additional infrastructure.

### The Decision

**Build an in-memory FlexSearch index, populated incrementally as content is loaded by TanStack Query.**

This requires Phase 1 (TanStack Query) to be complete first, because the search index is populated from TanStack
Query's cache — specifically from the `onSuccess` callbacks of query hooks when note content is fetched.

The index is intentionally **not persisted** to IndexedDB at this stage. If content volume or cold-start indexing time
becomes a problem in the future, migrating to a persisted index (or replacing with RxDB) is straightforward because
the search API exposed to components does not change. See [Future Path to VFS](#future-path-to-vfs) for this migration
path.

### Why FlexSearch

FlexSearch is already referenced in [`content_implementation_notes.md`](../content_features_and_implementation/content_implementation_notes.md)
as the candidate library. It was chosen for this implementation because:

- Best query performance among JS search libraries (benchmarked against Lunr, Fuse.js, MiniSearch)
- Document-oriented index API (`Document`) supports structured records with per-field weighting
- Small bundle size (~5KB gzipped for the document index)
- Supports `tokenize: 'forward'` for prefix matching (useful for incremental search-as-you-type)
- TypeScript types available

---

## Architecture Overview

```
┌────────────────────────────────────────────────────────────┐
│                    Search Flow                              │
│                                                             │
│   User types in SearchBar                                   │
│          │                                                  │
│          ▼                                                  │
│   useSearch(query) hook                                     │
│          │                                                  │
│          ▼                                                  │
│   searchIndex.search(query)  ◄── In-memory FlexSearch       │
│          │                        Document index            │
│          ▼                                                  │
│   Array of { id, name, type, parentId }                     │
│          │                                                  │
│          ▼                                                  │
│   SearchResults component renders matches                   │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│                    Index Population Flow                    │
│                                                             │
│   TanStack Query fetches note content (on editor open)      │
│          │                                                  │
│          ▼                                                  │
│   useContentItem onSuccess callback                         │
│          │                                                  │
│          ▼                                                  │
│   searchIndex.add({ id, name, content, type, parentId })    │
│                                                             │
│   TanStack Query fetches folder children (tree expand)      │
│          │                                                  │
│          ▼                                                  │
│   useFolderChildren onSuccess callback                      │
│          │                                                  │
│          ▼                                                  │
│   searchIndex.add({ id, name, type, parentId })             │
│   (name only — content body is not available yet)           │
└────────────────────────────────────────────────────────────┘
```

The index is populated **incrementally and passively** — there is no explicit "build index" step. Content is indexed
as it is loaded for other purposes (browsing the tree, opening notes). The first time a user opens the app in a
session, notes they browse will be indexed. Notes they never open will be indexed by name only (from the tree fetch).

---

## Index Schema

```typescript
// packages/web/src/lib/search/search-index.ts

import { Document } from 'flexsearch';

export interface SearchRecord {
  id: string;
  name: string;
  content?: string; // note body — only available after note is opened
  type: string;
  parentId: string | null;
}

export const searchIndex = new Document<SearchRecord>({
  document: {
    id: 'id',
    index: [
      {
        field: 'name',
        tokenize: 'forward',  // prefix matching for search-as-you-type
        resolution: 9,        // highest relevance weight
      },
      {
        field: 'content',
        tokenize: 'forward',
        resolution: 5,
      },
    ],
    store: ['name', 'type', 'parentId'], // stored for result rendering without re-fetch
  },
});
```

### Field Weights

| Field | Weight | Why |
|---|---|---|
| `name` | 9 (highest) | A note whose name matches is almost certainly the right result |
| `content` | 5 (medium) | Body text matches are relevant but rank below title matches |

### Tokenization

`tokenize: 'forward'` enables prefix matching: typing "sys" matches "system design", "system", "syscall", etc. This
is the right behavior for search-as-you-type. Alternative: `tokenize: 'full'` enables substring matching anywhere in
a word (slower, larger index, but finds "design" in "redesign").

---

## Index Lifecycle

### Adding a Record

```typescript
// When a note's full content is loaded (editor opened):
searchIndex.add({
  id: note.id,
  name: note.name,
  content: note.bodyText, // stripped of markdown syntax for cleaner indexing
  type: note.type,
  parentId: note.parentId,
});

// When folder children are loaded (tree browsed) — name only:
children.forEach(child => {
  searchIndex.add({
    id: child.id,
    name: child.name,
    type: child.type,
    parentId: child.parentId,
  });
});
```

### Updating a Record

FlexSearch's `Document` does not support partial updates. The pattern is remove + add.

```typescript
// On rename:
searchIndex.remove(id);
searchIndex.add({ id, name: newName, ...rest });
```

This is called in the `useRenameContent` mutation's `onSuccess` callback.

### Removing a Record

```typescript
// On delete:
searchIndex.remove(id);
```

Called in the `useDeleteContent` mutation's `onSuccess` callback.

### Session Scope

The index is a module-level singleton (`export const searchIndex = ...`). It is populated incrementally during the
session and discarded when the page is closed or refreshed. On the next session, it rebuilds as the user browses.
There is no persistence, no serialization, and no stale-data risk.

---

## Implementation Plan

> **Prerequisite:** Phase 1 (TanStack Query) must be complete before starting Phase 2.

### Step 1: Install FlexSearch

```bash
cd packages/web
pnpm add flexsearch
pnpm add -D @types/flexsearch
```

### Step 2: Create the Search Index Module

**New file:** `packages/web/src/lib/search/search-index.ts`

Create the `searchIndex` singleton and export the `SearchRecord` type. See [Index Schema](#index-schema) for the
full implementation.

Also export helper functions:

```typescript
export function indexContent(item: SearchRecord): void {
  // remove first to handle updates (re-indexing an existing item)
  searchIndex.remove(item.id);
  searchIndex.add(item);
}

export function removeFromIndex(id: string): void {
  searchIndex.remove(id);
}
```

### Step 3: Create Search Hooks

**New file:** `packages/web/src/lib/search/search-hooks.ts`

```typescript
import { useState, useCallback } from 'react';
import { searchIndex } from './search-index';
import type { SearchRecord } from './search-index';

export interface SearchResult {
  id: string;
  name: string;
  type: string;
  parentId: string | null;
}

export function useSearch() {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [query, setQuery] = useState('');

  const search = useCallback((searchQuery: string) => {
    setQuery(searchQuery);

    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    // FlexSearch Document.search returns results per field;
    // merge and deduplicate by id
    const fieldResults = searchIndex.search(searchQuery, { enrich: true });
    const seen = new Set<string>();
    const merged: SearchResult[] = [];

    for (const fieldResult of fieldResults) {
      for (const match of fieldResult.result) {
        const doc = match.doc as SearchRecord;
        if (!seen.has(doc.id)) {
          seen.add(doc.id);
          merged.push({
            id: doc.id,
            name: doc.name,
            type: doc.type,
            parentId: doc.parentId,
          });
        }
      }
    }

    setResults(merged);
  }, []);

  return { query, results, search };
}
```

### Step 4: Wire Index Population into Query Hooks

In `packages/web/src/lib/content/content-hooks.ts` (created in Phase 1), add `onSuccess` callbacks to populate the
index.

```typescript
import { indexContent, removeFromIndex } from '../search/search-index';

// In useContentItem — indexes full content when a note is opened:
export function useContentItem(id: string | undefined) {
  const { currentUser } = useAuth();
  return useQuery({
    queryKey: contentQueryKeys.item(id!),
    queryFn: () => contentService.getContentById(currentUser!, id!),
    enabled: !!currentUser && !!id,
    // Note: bodyText stripping (markdown → plain text) is done in the service
    // or a separate utility before indexing
    select: (data) => {
      indexContent({
        id: data.id,
        name: data.name,
        content: data.bodyText,
        type: data.type,
        parentId: data.parentId,
      });
      return data;
    },
  });
}

// In useFolderChildren — indexes names when the tree is browsed:
export function useFolderChildren(parentId: string | undefined) {
  const { currentUser } = useAuth();
  return useQuery({
    queryKey: contentQueryKeys.children(parentId!),
    queryFn: () => contentService.getContentByParentId(currentUser!, parentId!),
    enabled: !!currentUser && !!parentId,
    select: (data) => {
      data.forEach(item => indexContent({
        id: item.id,
        name: item.name,
        type: item.type,
        parentId: item.parentId,
      }));
      return data;
    },
  });
}
```

> Using `select` (not `onSuccess`, which was removed in TanStack Query v5) ensures the side effect runs
> synchronously with data transformation and handles re-renders correctly.

In `useRenameContent` and `useDeleteContent` mutations, call `indexContent` / `removeFromIndex` in `onSuccess`.

### Step 5: Markdown Stripping Utility

Note body text will be markdown. Indexing raw markdown includes syntax characters (`#`, `*`, `_`, `[`, `]`) that add
noise to the search index. Strip them before indexing.

**New file:** `packages/web/src/lib/search/strip-markdown.ts`

```typescript
export function stripMarkdown(markdown: string): string {
  return markdown
    .replace(/#{1,6}\s/g, '')          // headings
    .replace(/(\*{1,3}|_{1,3})(.*?)\1/g, '$2')  // bold/italic
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')     // links → link text
    .replace(/`{1,3}[^`]*`{1,3}/g, '')           // inline code and code blocks
    .replace(/^\s*[-*+]\s/gm, '')                // list markers
    .replace(/^\s*>\s/gm, '')                    // blockquotes
    .replace(/\n{2,}/g, '\n')                    // collapse multiple newlines
    .trim();
}
```

This is intentionally simple. For more complete stripping, consider the `remove-markdown` package, but the above
handles the common cases without an additional dependency.

### Step 6: Create SearchBar Component

**New file:** `packages/web/src/components/SearchBar.tsx`

A controlled input that calls `search(query)` from `useSearch()` on every keystroke (debounced at 150ms).

```typescript
import { TextField, InputAdornment } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useDeferredValue } from 'react';

interface SearchBarProps {
  onSearch: (query: string) => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({ onSearch }) => {
  const [value, setValue] = useState('');
  const deferredValue = useDeferredValue(value); // React 18 built-in debouncing

  useEffect(() => {
    onSearch(deferredValue);
  }, [deferredValue, onSearch]);

  return (
    <TextField
      size='small'
      fullWidth
      placeholder='Search notes...'
      value={value}
      onChange={e => setValue(e.target.value)}
      slotProps={{
        input: {
          startAdornment: (
            <InputAdornment position='start'>
              <SearchIcon fontSize='small' />
            </InputAdornment>
          ),
        },
      }}
    />
  );
};
```

> `useDeferredValue` is React 18's built-in mechanism for deferring non-urgent state updates. It is preferred over
> `setTimeout`-based debouncing because it integrates with React's concurrent rendering scheduler.

### Step 7: Create SearchResults Component

**New file:** `packages/web/src/components/SearchResults.tsx`

Renders the list of `SearchResult[]`. Each result is clickable and navigates to the note. Folders can be selected
(highlighting them in the tree) but do not navigate to an editor.

The component should also indicate to the user what the current search path looks like
(e.g., show the parent folder name next to each result).

### Step 8: Integrate Search into NavigationDrawer

Add `SearchBar` above `ContentExplorer` in the drawer. When a search query is active (non-empty), replace
`ContentExplorer` with `SearchResults`. When the query is cleared, restore `ContentExplorer`.

```tsx
const { query, results, search } = useSearch();
const showSearch = query.trim().length > 0;

// In drawer content:
<SearchBar onSearch={search} />
{showSearch
  ? <SearchResults results={results} />
  : <ContentExplorer />
}
```

---

## File-by-File Changes Summary

| File | Change |
|---|---|
| `packages/web/package.json` | Add `flexsearch`, `@types/flexsearch` |
| `packages/web/src/lib/search/search-index.ts` | **New file** — FlexSearch Document index singleton |
| `packages/web/src/lib/search/search-hooks.ts` | **New file** — `useSearch` hook |
| `packages/web/src/lib/search/strip-markdown.ts` | **New file** — markdown → plain text utility |
| `packages/web/src/lib/search/index.ts` | **New file** — barrel export |
| `packages/web/src/lib/content/content-hooks.ts` | Add `select` callbacks to populate index on query success |
| `packages/web/src/components/SearchBar.tsx` | **New file** — controlled search input with deferred value |
| `packages/web/src/components/SearchResults.tsx` | **New file** — list of search matches |
| `packages/web/src/components/NavigationDrawer.tsx` | Add SearchBar + conditional SearchResults/ContentExplorer |

---

## Future Path to VFS

If any of the following become true, the in-memory index should be replaced with a persisted solution:

- **Cold-start indexing is slow:** When content volume is large enough that users notice the index is empty when they
  first open the app in a session. Threshold is roughly 10,000+ notes with body text.
- **Offline search is required:** If the app needs to work without a network connection.
- **Multi-device sync:** If content can be edited on multiple devices simultaneously, requiring merge semantics.

The migration path at that point is:

1. **RxDB** replaces TanStack Query + FlexSearch in one move. RxDB is a reactive document database for the browser
   that uses IndexedDB for persistence, ships with a FlexSearch plugin for full-text search, and has a CouchDB-sync
   adapter for backend synchronization. The query API (`useRxQuery`) is structurally similar to TanStack Query's
   `useQuery`, so component changes are minimal.
2. **Encryption at rest** is handled by RxDB's encryption plugin (uses the Web Crypto API). The encryption key can
   be derived from the user's Firebase Auth token.

The search API surface exposed to components (`useSearch`, `SearchResult`) does not change in this migration —
only the implementation of the `searchIndex` module is swapped out. This is the primary reason for keeping the index
behind a module abstraction rather than calling FlexSearch directly in components.
