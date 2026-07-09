# Storage Model Refactor

**Status:** Design approved (2026-07-07). Implementation pending.
**Origin:** Review of the current `docs/dev/storage_model.md` against future feature requirements ([innovative learning features brainstorm](../research/inovative_learning_features.md)).

## Motivation

The current model has accumulated tactical decisions (`folderId` denormalization, cards as a subcollection, flat `Content` interface) that made sense during early MVP iterations but now create friction:

- **Type safety gaps.** The `Content` interface uses optional fields for everything, pushing validation into scattered runtime checks.
- **Denormalized staleness.** `folderId` on decks can go stale when a note is moved to a different folder.
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

### 2. Remove `folderId` from decks

**What:** Delete the denormalized `folderId` field. `findDecksByFolderIds` rewrites to traverse `parentId` chains or query via `cards`/`study_results` collections.

**Why:**

- **Staleness hazard.** Moving a note to a different folder leaves its decks' `folderId` pointing at the old folder. There is no trigger or hook to repair it.
- **Premature optimization.** `folderId` only exists to avoid recursive `WHERE parentId = …` queries. With a local browser cache (Cache Storage + IndexedDB) absorbing query cost, this optimization buys nothing.
- **Correct by construction.** `deck.parentId → note.parentId → folder` is always accurate. No synchronization to maintain.

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

---

## Migration notes

1. **New `cards` collection.** One-time migration from `content/{deckId}/cards` subcollection to top-level `cards`. Write a migration script that copies each card document and adds `deckId` + `position` fields. Validate with a dry run first.

2. **New `study_results` collection.** Extract `dueDate`, `interval`, `repetitions`, `lastResult`, `lastStudied`, `correctCount`, `incorrectCount` from existing card documents. Each becomes a document keyed by `(cardId, ownerId)`.

3. **Remove `folderId`.** Drop the field from all deck documents. Rewrite `findDecksByFolderIds` to use the `cards` collection (`WHERE deckId IN (SELECT id FROM content WHERE parentId IN (noteIds))`) or defer to the local cache layer once implemented.

4. **Discriminated union.** Purely a code change — no Firestore migration needed. Update `Content` interface, `ContentDocument` mapping, and fix compile errors where optional fields were accessed without narrowing.

5. **`findAllDescendantIds` bug.** When converting to the discriminated union, fix the directory traversal to collect deck children of notes (not just directory children). This resolves the documented limitation where directory deletion misses decks.

---

## See also

- [Current storage model](storage_model.md) — what exists today
- [Content naming conventions](content_naming.md) — terminology
- [Innovative learning features brainstorm](../research/inovative_learning_features.md) — future features that informed these decisions
- [Blob storage model proposal](../research/note_editor/blob_storage_model_proposal.md) — blob design rationale (unchanged)
