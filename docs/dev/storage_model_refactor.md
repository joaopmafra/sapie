# Storage Model Refactor

**Status:** Design approved (2026-07-07). Implementation pending.
**Origin:** Review of the current `docs/dev/storage_model.md` against future feature requirements ([innovative learning features brainstorm](../research/inovative_learning_features.md)).

## Motivation

The current model has accumulated tactical decisions (`folderId` denormalization, cards as a subcollection, flat `Content` interface) that made sense during early MVP iterations but now create friction. The refactor addresses these, and also renames `folderId` → `directoryId` for domain language consistency.
- **Type safety gaps.** The `Content` interface uses optional fields for everything, pushing validation into scattered runtime checks.
- **Denormalized staleness.** `folderId` on decks can go stale when a note is moved — the refactor keeps the field (renamed to `directoryId`) and documents the repair responsibility on the note-move operation.
- **Subcollection coupling.** Cards living under `content/{deckId}/cards` makes standalone card queries harder and ties card lifecycle to deck documents.

The refactor aligns the storage model with the project's architectural principles: metadata in Firestore, content bodies in GCS, a discriminated type hierarchy, and a design optimized for correctness first (local browser cache will absorb query cost, so server-side query micro-optimizations are premature).

---

## Settled decisions

### 1. Discriminated union for Content

**What:** Replace the flat `Content` interface with a discriminated union shaped like Java's single-table inheritance. The Firestore `content` collection remains flat; the domain layer gets type safety.

**Domain model (conceptual):**

```typescript
interface BaseContent {
  id: string;
  name: string;
  parentId: string | null;
  ownerId: string;
  tags?: string[];
  deleted?: boolean;
  deletedAt?: Date | null;
  deletedBy?: { uid: string } | null;
  createdAt: Date;
  updatedAt: Date;
}

interface Directory extends BaseContent {
  type: 'directory';
}

interface Note extends BaseContent {
  type: 'note';
  body: ContentBody | null;
}

interface Deck extends BaseContent {
  type: 'deck';
  // deck-level config — all fields optional, all metadata-scale (<500 bytes)
  description?: string;
  cardStyle?: 'qa' | 'cloze' | 'open_ended';
  defaultDepth?: 'foundation' | 'applied' | 'detail';
  language?: string;
}

type Content = Directory | Note | Deck;
```

**Why:**

- The `type` literal discriminant lets the compiler enforce validity (e.g. `body` only exists on `Note`, `description` only on `Deck`).
- Eliminates runtime checks like `if (existing.type !== ContentType.DIRECTORY)` scattered across `ContentService`.
- The Firestore document stays flat (single collection) — the discriminated union is a domain-layer concern, not a schema change.

### 2. Keep `folderId`, rename to `directoryId`

**What:** Retain the denormalized directory reference on decks. Rename the field from `folderId` to `directoryId` for consistency with the project's domain language (`Directory` type, `parentId` pointing to a directory). All endpoints, query params, frontend types, and hooks must use `directoryId` — never `folderId`.

**Domain model (with jsdoc):**

```typescript
interface Deck extends BaseContent {
  type: 'deck';
  description?: string;
  cardStyle?: 'qa' | 'cloze' | 'open_ended';
  defaultDepth?: 'foundation' | 'applied' | 'detail';
  language?: string;
  /**
   * Denormalized ID of the directory containing this deck's parent note.
   * Enables efficient folder-level study queries (`WHERE directoryId = ? AND type = 'deck'`)
   * without traversing `deck.parentId → note.parentId → directory` chains.
   *
   * Set once at deck creation (snapshot of note.parentId). If the note is moved
   * to a different directory, this field must be repaired — currently handled by
   * the note-move operation updating all child decks.
   */
  directoryId: string | null;
}
```

**Why keep it:**

- **Fast single-folder deck queries.** `WHERE directoryId = ? AND type = 'deck'` is a direct indexed query. Without it, finding all decks in a folder requires: fetch all notes in the folder → fetch all decks where `parentId` is one of those note IDs. Two queries, N+1 potential, no single index.
- **Study dashboard aggregation.** Content roots (Story 81) aggregate cards across entire folder hierarchies. The `directoryId` denormalization anchors decks to their folder for the recursive descendant collection step.
- **Staleness is manageable.** The note-move operation already handles updating child deck `directoryId` values. It's a single write per moved deck — cheaper than the alternative of multi-step queries on every study session.

**Why rename:**

- The domain model uses `Directory` for the type literal and `parentId` to reference parent directories. `folderId` is the only place the term "folder" appears in the schema — it's inconsistent.
- Codebase convention: pick one term and use it everywhere. `directory` wins because it's already the `type` literal value.

### 3. Cards as a standalone collection

**What:** Move cards from `content/{deckId}/cards` (subcollection) to a top-level `cards` collection. One document per card.

**Card document fields:**

|Field|Type|Description|
|---|---|---|
|`deckId`|`string`|Parent deck ID (references `content` doc)|
|`ownerId`|`string`|Firebase Auth UID|
|`position`|`number`|Ordinal position within the deck (0-based, monotonically assigned)|
|`front`|`string`|Question/prompt — markdown, JSON-native escaping|
|`back`|`string`|Answer — markdown, JSON-native escaping|
|`deleted`|`boolean`|Soft-delete flag|
|`deletedAt`|`Timestamp \| null`|When soft-deleted|
|`createdAt`|`Timestamp`|Creation timestamp|
|`updatedAt`|`Timestamp`|Last update timestamp|

**Why:**

- Cards are content, not metadata. The metadata/body split principle says they belong in a separate collection.
- Standalone collection enables direct queries (`WHERE deckId = … ORDER BY position`) without navigating through a parent document.
- Deck deletion cascading to cards becomes an explicit application-level query — visible and testable.
- No Firestore 1 MiB document limit concern: a single card is typically <5 KB.
- Markdown with embedded image references (`![alt](/api/content/{noteId}/blobs/{blobId})`) survives `JSON.stringify`/`JSON.parse` natively — no base64 needed.

**Composite index:** `(deckId, position)` for ordered deck listing, `(deckId, ownerId)` for authorization-filtered queries.

### 4. Study results as a separate collection

**What:** A new `study_results` collection decouples scheduling state from card content. One document per (user, card) pair.

|Field|Type|Description|
|---|---|---|
|`cardId`|`string`|References `cards` collection|
|`userId`|`string`|Firebase Auth UID of the learner|
|`dueDate`|`Timestamp`|Next review date|
|`interval`|`number`|Days until next review (SM-2)|
|`repetitions`|`number`|Consecutive "know" count|
|`lastResult`|`"know" \| "dont_know" \| null`|Last study outcome|
|`lastStudied`|`Timestamp \| null`|When last studied|
|`correctCount`|`number`|Total "know" responses|
|`incorrectCount`|`number`|Total "don't know" responses|
|`createdAt`|`Timestamp`|First study timestamp|
|`updatedAt`|`Timestamp`|Last update timestamp|

**Why:**

- **Separation of concerns.** Cards are immutable content (front/back). Study state is per-user mutable data. They change at different rates, for different reasons, by different actors.
- **Multi-user support.** When decks are shared, each learner gets their own `study_results` rows — no write contention on a shared card document.
- **Due-card queries.** `WHERE userId = ? AND dueDate <= now ORDER BY dueDate` with a composite index is the canonical study query. No GCS scanning, no content tree traversal.
- **FSRS migration path.** Scheduling fields live in `study_results`, not on `cards`. Upgrading the algorithm only touches this collection; card content is untouched.

**Composite index:** `(userId, dueDate)` for the primary due-cards query.

### 5. Keep `content` collection metadata-only

**What:** The `content` collection never carries payload bytes. Note bodies remain in GCS. Deck cards move to the `cards` collection. Deck-level config stays on the `content` document because it's metadata-scale (<500 bytes).

**Why:**

- Prevents Firestore document bloat. The 1 MiB limit is for metadata; 2 MiB bodies go to GCS.
- Clean separation: `content` = tree structure + identity + small config. `cards` + `study_results` = card content + scheduling. GCS = note bodies + blobs.
- A future `user_preferences` collection will carry per-user learning config (TTS voice, gap duration, technique weights) — also not on `content`.

### 6. No `flashcard_decks` collection split

**What:** Decks remain `type: "deck"` rows in the `content` collection. No parallel `flashcard_decks` collection.

**Why:**

- Deck-level config (description, card style, depth, language) is metadata-scale. Moving it to a separate collection creates a 1:1 mirror of the `content` row with zero additional value.
- The brainstormed features ([innovative learning features](../research/inovative_learning_features.md)) add no deck-specific payloads that are large, complex, or have different access patterns from metadata.
- Split when a feature *does* justify it — e.g., deck marketplace with ratings/reviews, or public deck catalogs with different security rules. That's not on the roadmap.

### 7. Blob storage unchanged

**What:** Inline images in both notes and card markdown use the existing blob pattern: `POST /api/content/{noteId}/blobs` → `{ownerId}/content/{contentId}/blobs/{blobId}` in GCS. Embedded as `![alt](/api/content/{noteId}/blobs/{blobId})`.

**Why:**

- Already implemented and working (Story 75).
- Blobs are immutable, cache-friendly, and have no Firestore document — no reconciliation overhead.
- Cards reference images the same way notes do. The blob belongs to the note (where the GCS prefix lives), not to the card.

### 8. Future: local sync via CacheStorage API

**What (future):** The current Firestore-backed query model may eventually be replaced or augmented by a local-first synchronization layer using browser APIs — specifically the [Web CacheStorage API](https://developer.mozilla.org/en-US/docs/Web/API/CacheStorage) for content bodies and IndexedDB for metadata. Under this model:

- The entire content tree (or a working subset) is synced to the browser at session start.
- Queries that currently hit Firestore (`WHERE directoryId = ?`, `WHERE dueDate <= ?`) run against the local store instead.
- The server remains the source of truth; the client syncs changes incrementally.

**Impact on `directoryId`:**

- The `directoryId` denormalization exists to make server-side folder-level deck queries efficient (avoiding recursive `WHERE parentId = …` chains).
- With a local cache, all content metadata is available in-memory or in IndexedDB. Filtering decks by their note's parent directory becomes a local operation — no server round-trip, no index dependency.
- **At that point, `directoryId` may no longer be needed.** The field could be dropped in favor of a pure `deck.parentId → note.parentId → directory` traversal computed client-side.

**Why keep `directoryId` for now:**

- The local sync layer does not exist yet. Until it does, server-side query efficiency matters.
- Removing `directoryId` now means paying the recursive query cost on every folder-level study operation — a regression with no compensating benefit.
- When local sync is implemented and proven (performance measured, edge cases handled), `directoryId` removal becomes a straightforward cleanup: delete the field, remove the staleness repair code, simplify the model. That's a simpler change than adding it back later.

**Migration path:**

1. Implement local sync (CacheStorage + IndexedDB) as an opt-in layer.
2. Measure query performance with and without `directoryId` on the client side.
3. If local traversal is fast enough (<100ms for typical folder sizes), drop `directoryId` from the schema and remove the repair logic.
4. Update `storage_model.md` to reflect the new sync architecture.

---

## Collection map (after refactor)

|Collection|Purpose|Key queries|
|---|---|---|
|`content`|Tree metadata for directories, notes, decks. Flat, discriminated by `type`.|`WHERE parentId = ?`, `WHERE tags ARRAY_CONTAINS ?`|
|`cards`|Flashcard content (front/back markdown). Standalone, one doc per card.|`WHERE deckId = ? ORDER BY position`|
|`study_results`|Per-user study scheduling state. One doc per (user, card) pair.|`WHERE userId = ? AND dueDate <= now ORDER BY dueDate`|
|`user_preferences` *(future)*|Per-user learning config: TTS voice, gap duration, technique weights, etc.|`WHERE userId = ?`|

GCS paths unchanged:

|Path|Purpose|
|---|---|
|`{ownerId}/content/{contentId}`|Note body (markdown)|
|`{ownerId}/content/{contentId}/blobs/{blobId}`|Inline images (immutable)|

## Migration notes

1. **New `cards` collection.** One-time migration from `content/{deckId}/cards` subcollection to top-level `cards`. Write a migration script that copies each card document and adds `deckId` + `position` fields. Validate with a dry run first.

2. **New `study_results` collection.** Extract `dueDate`, `interval`, `repetitions`, `lastResult`, `lastStudied`, `correctCount`, `incorrectCount` from existing card documents. Each becomes a document keyed by `(cardId, ownerId)`.

3. **Rename `folderId` → `directoryId`.** Rename the field on all deck documents in Firestore. Update all API query params (`?directoryId=…`), DTOs, frontend types, hooks, and service methods. Use `lsp rename` on the TypeScript property to propagate to all call sites. No logic change — purely a nomenclature rename.

4. **Discriminated union.** Purely a code change — no Firestore migration needed. Update `Content` interface, `ContentDocument` mapping, and fix compile errors where optional fields were accessed without narrowing.

5. **`findAllDescendantIds` bug.** When converting to the discriminated union, fix the directory traversal to collect deck children of notes (not just directory children). This resolves the documented limitation where directory deletion misses decks.


6. **Update `storage_model.md`.** After all migrations are applied and verified, rewrite `docs/dev/storage_model.md` to reflect the new model: discriminated union types, cards as a standalone `cards` collection, `study_results` as a separate collection, `directoryId` (renamed from `folderId`), and the updated collection map. The current doc describes the pre-refactor state and will be stale once migration completes.
---

## See also

- [Current storage model](storage_model.md) — what exists today
- [Content naming conventions](content_naming.md) — terminology
- [Innovative learning features brainstorm](../research/inovative_learning_features.md) — future features that informed these decisions
- [Blob storage model proposal](../research/note_editor/blob_storage_model_proposal.md) — blob design rationale (unchanged)
