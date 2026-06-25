# Observed once: note editor save loop after switching notes

**Status:** Not reproduced since initial report. **No fix planned** until it recurs or is captured with diagnostics below.

## Summary

In **staging** (Firebase-hosted), the note editor entered a loop of `PUT /api/content/:id/body` requests after the user
edited a note, selected another note in the sidebar tree, then returned to the original note. Each save completed and
immediately triggered another. After some time the save status showed **"Error saving"** with a manual **Retry** button.

This note captures suspected causes and a short diagnostic checklist so a future occurrence does not require re-reading
the autosave implementation from scratch.

## Observed behavior

1. User edited note **A** body text in the note editor.
2. User selected note **B** in the content tree (in-app navigation to `/notes/:noteId`).
3. User returned to note **A**.
4. Network tab showed repeated body `PUT`s — a new save starting right after the previous one finished.
5. Eventually the header showed **"Error saving"** and a **Retry** button.

**Environment:** staging (Firebase). **Editor variant:** rich MDXEditor (browser default; see `getNoteBodyEditorVariant()`).

**Repro status:** happened once; not reproduced on later testing.

**Note content at time of bug:** unknown (whether the note had extra blank lines, lists, code blocks, etc. was not recorded).

## What is intentional (not the bug)

- **"Error saving" + Retry** is implemented behavior ([Story 55](../../pm/5-done/55-story-note_content_editor.md) Phase 3).
  Retry runs only when the user clicks the button — there is **no** automatic retry-on-error loop.
- **Chained saves within one `runSave` turn** are intentional when the draft changes while a `PUT` is in flight (see tests
  in `NoteEditorPage.test.tsx`).

## How autosave can produce back-to-back PUTs

`NoteEditorPage` compares `draftBody` to `baselineBody` (last successfully saved text). When they differ after a
successful `PUT`, `runSave` loops immediately (no debounce) until they match or a `PUT` fails.

Relevant code:

- `packages/web/src/pages/NoteEditorPage.tsx` — `runSave`, `handleDraftBodyUpdate`, `resolvedServerBody` effect,
  navigation flush, unmount flush on `noteId` change.
- `packages/web/src/lib/content/content-hooks.ts` — `useSaveNoteBody`, `syncCachesAfterPutNoteBody`.

**Important navigation detail:** `NoteEditorPage` does **not** remount when switching notes — only the `:noteId` route
param changes. A per-mount `editorSessionId` and the Story 66 “suppress signed-URL refetch after save” flag persist for
the whole editor session.

## Suspected causes (ranked)

### 1. MDXEditor markdown round-trip / normalization (most likely)

The rich editor can **export different markdown** than it **imports** for the same visual content (CommonMark / mdast
collapse). Documented product gap: [Story 68](../../pm/3-stories/2-to-refine/68-story-rich_editor_extra_blank_line_round_trip.md).

Plausible loop:

1. Load body text `S` from server/cache → baseline = `S`.
2. MDXEditor parses and fires `onChange(S', fromInitialNormalize=true)` where `S' ≠ S`.
3. `handleDraftBodyUpdate` **ignores** normalize events when `S' ≠ baseline` (baseline stays `S`).
4. A later non-initial `onChange(S')` schedules save because `S' ≠ S`.
5. Save stores `S'`; if the next load/cache sync resolves back to `S` or a third variant, the cycle repeats.

Returning to note A remounts the editor (`key={noteId}`) and may call `setMarkdown(incoming)` when server body differs from
local draft — a strong trigger for normalize → save cycles.

### 2. `bodyVersionKey` cache miss while signed-URL fetch is suppressed

After a successful save, the editor skips Storage download and reads body text from TanStack Query cache keyed by
`(noteId, body.updatedAt)`. Metadata refetches on every note open (`refetchOnMount: 'always'`).

If `body.updatedAt` advances but the matching `noteBodyText` cache entry is missing, `resolvedServerBody` can fall
through to `''` while MDXEditor still holds prior content → spurious saves or oscillation. See Story 66 cache policy.

### 3. Navigation flush + note switch race (lower probability)

Switching notes with unsaved edits should block navigation and flush first (`useBlocker` + `flushSaveForNavigation`). A
cleanup effect can also call `runSave(oldNoteId)` on `noteId` change. Tests cover the happy path; a race between flush,
cleanup, and state reset is possible but less likely than normalization.

### 4. Eventual PUT failure (why the loop stopped)

There is no auto-retry. The loop ends when a `PUT` throws (network, rate limit, auth, validation). Repeated identical
saves in staging could hit transient Firebase or HTTP errors.

## If it happens again: diagnostic checklist

Capture before refreshing the page:

1. **Consecutive PUT request bodies** — byte-identical (same text re-saved) vs alternating (two competing strings). That
   split points to cache/version issues vs normalization ping-pong.
2. **Note markdown shape** — extra blank lines, lists, headings, code blocks (Story 68 patterns are high signal).
3. **React Query DevTools** (or logged query keys):
   - `content/item/:id` — `body.updatedAt`
   - `content/note-body-text/:id/:version`
   - `content/body-signed-url-fetch-suppressed/:id/:editorSessionId`
4. **Failing PUT** — HTTP status and response body from the last request before "Error saving".
5. **Plain editor check** — if reproducible locally, set `VITE_NOTE_EDITOR=plain` and repeat; if the loop disappears,
   MDX normalization is the prime suspect.

## Related work (when fixing)

- [Story 68: Preserve extra blank lines (markdown round-trip)](../../pm/3-stories/2-to-refine/68-story-rich_editor_extra_blank_line_round_trip.md) — primary planned fix for load/save normalization; explicitly calls out autosave + `setMarkdown`.
- [Story 66: Content body subdocument and client cache policy](../../pm/5-done/66-story-content_body_subdocument_and_client_cache.md) — body version keys and suppress signed-URL after save.
- [Story 65: Note body concurrency](../../pm/3-stories/2-to-refine/65-story-note_body_concurrency_and_conflict_resolution.md) — conflict reload via `setMarkdown` (orthogonal unless reload path shares the same bug).

## Test coverage gap

`NoteEditorPage.test.tsx` covers note switching, navigation flush, and chained PUTs during in-flight saves (plain
textarea by default). There is **no** test for “return to note A → MDX normalization → save loop”. Adding one would
belong with Story 68 or a dedicated fix story once the root cause is confirmed.

## Change log

- **2026-06-25** — Initial observation doc after staging session (single occurrence, not reproduced).
