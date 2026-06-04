# Story 68: Preserve extra blank lines in rich note editor (markdown round-trip)

## Description

When a user inserts an **extra blank line** between two paragraphs in the **rich** note editor (MDXEditor), the gap is
visible while editing and the body **saves correctly** to Storage (e.g. `abc` then multiple newlines then `abc`). After
**reload** (or `setMarkdown` from server text), that extra vertical gap **disappears** and the two lines read as
adjacent paragraphs with only normal paragraph spacing.

This story fixes **markdown import → Lexical** round-tripping so intentional empty paragraphs survive save/load. It is
**not** an API or Storage bug: the signed-URL response can already contain the extra newlines; the loss happens when
MDXEditor parses markdown through **mdast** (CommonMark rules).

## Epic Reference

- [Epic 45: Content Management Foundation](../../1-epics/2-to-refine/45-epic-content_management_foundation.md)

## Feature Reference

- [Feature 47: Note Editing & Management](../../2-features/1-ready/47-feature-note_editing_and_management.md)

## User story

As a user writing study notes in the rich editor, I want an extra blank line between paragraphs to **still be there**
after auto-save and when I reopen the note, so spacing in my notes matches what I typed.

## Dependencies

- [Story 55: Note Content Editor](../../5-done/55-story-note_content_editor.md) — body load/save, autosave, `PUT` / signed URL fetch.
- [Story 66: Content body subdocument and client cache policy](../../5-done/66-story-content_body_subdocument_and_client_cache.md) — stable body load path and cache keys.
- [Story 67: Rich note content editor (MDXEditor)](../../4-in-progress/67-story-rich_note_content_editor_mdx.md) — rich editor is where the bug appears; **complete or near-complete** before implementing this story.

**Related (do not duplicate):**

- [Story 65: Note Body Concurrency and Conflict Resolution](../2-to-refine/65-story-note_body_concurrency_and_conflict_resolution.md) — orthogonal; coordinate if conflict reload also calls `setMarkdown`.

## Problem statement (observed behavior)

1. User types `abc`, presses Enter twice (or otherwise creates an **empty paragraph** between blocks), types `abc`.
2. Editor shows a **clear blank row** between the two lines (cursor can sit on that row).
3. After save, Storage/fake-storage read returns markdown along the lines of:

   ```text
   abc



   abc
   ```

   (multiple `\n` between the two text lines — exact count may vary with export.)

4. After full page reload, the rich editor shows **no extra blank row** — only the default gap between two paragraphs
   (or lines visually collapsed compared to step 2).

## Root cause (technical)

- In the editor, an extra gap is a **Lexical empty `ParagraphNode`** between two text paragraphs.
- On export, MDXEditor / `mdast-util-to-markdown` can serialize that as **more than one** `\n\n` between blocks (e.g.
  `abc\n\n\n\nabc`).
- On import, **`mdast-util-from-markdown`** (CommonMark) treats runs of blank lines between blocks as **insignificant**:
  `abc\n\n\n\nabc` and `abc\n\nabc` both become an AST with **two** `paragraph` nodes, **no** empty paragraph in the
  middle. Lexical therefore renders two paragraphs with **no** extra empty block.
- MDXEditor’s `onChange(..., initialMarkdownNormalize)` and export `.trim()` are secondary; the primary issue is **AST
  collapse on parse**, not missing backslash escapes or failed `PUT`.

**Verified locally (mdast 2.x):**

- Parse `abc\n\n\n\nabc` → 2 children; serialize → `abc\n\nabc\n`.
- Manually build AST with an **empty** middle paragraph → serialize → `abc\n\n\n\nabc\n`; re-parse that string → **2**
  children again (empty paragraph still lost unless the middle paragraph has **content**).

**Upstream context:** MDXEditor v3.54+ fixed a **similar** round-trip issue for **empty lines inside blockquotes**
([issue #920](https://github.com/mdx-editor/editor/issues/920)); root-level empty paragraphs between normal paragraphs
remain governed by CommonMark unless we add a Sapie-side strategy.

## Recommended approach (for implementation)

**Primary: load-time “inflate” empty paragraphs** (smallest vertical slice)

Before passing server markdown into `MDXEditor` (`markdown` prop / `setMarkdown`), transform extra `\n\n` **gaps** into
empty paragraphs that mdast **retains**, using a **contentful** spacer line:

- Prefer a paragraph containing **U+00A0** (no-break space) or **U+200B** (zero-width space) between `\n\n` separators,
  e.g. `abc\n\n\u00a0\n\nabc`, so mdast keeps **three** block nodes and the rich editor shows the extra gap again.
- Implement as pure functions in `packages/web` (e.g. `prepareMarkdownForMdxEditorLoad` / `normalizeMarkdownGapRuns`)
  with **unit tests** on strings (no MDXEditor mount required for core logic).

**Optional (second slice): save-time normalization**

- On `PUT`, normalize exported markdown so empty paragraphs are **always** stored in the chosen canonical form (e.g.
  nbsp spacer paragraph), not only relying on `\n\n\n\n` runs that external tools may collapse.
- Keeps on-disk markdown stable for MCP, git diff, or non-MDXEditor consumers.

**Apply transform at:**

- `NoteEditorPage` when `resolvedServerBody` / `noteBodyQuery.data` is applied to `draftBody` and `richBodyEditorRef.setMarkdown`.
- Initial mount `markdown={value}` on `RichNoteBodyEditor` (same prepared string).
- **Plain textarea editor:** either apply the **same** helpers for parity, or document that plain mode stores raw bytes
  and may show ` ` / invisible characters — product decision in implementation.

**Do not rely on:**

- More `\n` characters alone without spacer content.
- `\` line-ending hard breaks (those are **in-paragraph** soft breaks, not empty paragraphs).

## Alternative approaches (documented for decision)

- **Accept CommonMark:** Document that only one paragraph break is portable; extra gaps are not supported (no code).
- **HTML spacer:** e.g. `abc\n\n<br />\n\nabc` — mdast keeps `html` node; confirm MDXEditor renders gap; conflicts with
  “no raw HTML for users” unless storage-only / internal.
- **Custom mdast import visitor** in a forked plugin — high maintenance.
- **Upstream MDXEditor change** — possible long-term; track issues/PRs on [mdx-editor/editor](https://github.com/mdx-editor/editor).

## Scope

**In scope**

- [ ] Pure functions + tests for gap detection and inflate/deflate (or round-trip spec) as agreed in implementation.
- [ ] Wire **load** transform into rich editor data path (`NoteEditorPage` / hooks).
- [ ] Manual smoke: extra blank line → save → reload → gap still visible in rich editor.
- [ ] Document chosen spacer strategy (nbsp vs ZWSP vs HTML) in code comment and optionally one dev note in
  `packages/web/README.md` (short subsection under note editor).
- [ ] Confirm behavior with **autosave** and **suppress signed-URL refetch after save** (Story 66) — editor should not
  strip gap when cache sync calls `setMarkdown` with same logical content.

**Out of scope**

- Changing CommonMark for the whole ecosystem or patching `mdast-util-from-markdown` globally.
- Blockquote-internal empty lines (unless same helper naturally covers them).
- Story 65 conflict-resolution UX (only touch if reload path shares markdown preparation).
- Math/LaTeX, tables, or new toolbar features.

## Acceptance criteria

- [ ] In the **rich** editor, two paragraphs separated by an **intentional empty paragraph** (user-inserted blank line)
  still show that extra vertical gap after **auto-save** and after a **full page reload** (or navigation away and back).
- [ ] Body bytes in Storage remain **valid markdown**; no silent data loss on save (server object still reflects editor
  export; user-visible content preserved).
- [ ] Unit tests cover at least: `abc\n\n\n\nabc` (or equivalent export) → prepare for load → string that mdast parses to
  **three** blocks; round-trip test from “editor export shape” → prepare → expected spacer form.
- [ ] **No regression** for simple `abc\n\nabc` (single paragraph break) — spacing matches current behavior.
- [ ] Plain editor variant (if kept): behavior documented in story completion notes — either same round-trip helpers or
  explicit “raw markdown” caveat.

## Implementation notes (starting points)

**Likely files**

- `packages/web/src/pages/NoteEditorPage.tsx` — where `resolvedServerBody` sets `draftBody` / `setMarkdown`.
- `packages/web/src/pages/note-body-editor/RichNoteBodyEditor.tsx` — only if preparation is done inside editor wrapper.
- New: `packages/web/src/pages/note-body-editor/markdown-empty-paragraph-round-trip.ts` (name TBD) + `*.test.ts`.
- `packages/web/src/lib/content/content-hooks.ts` — only if normalization belongs on fetch (prefer central helper used by page).

**Gap-count heuristic (draft)**

- Between two non-empty lines, a run of `\n\n` repeated **N** times in the raw file implies **N − 1** empty paragraphs
  between them when N ≥ 2.
- Example: separator `\n\n\n\n` between `abc` and `abc` → two `\n\n` units → **one** empty paragraph to inflate.

**Risks**

- **Invisible characters** in raw markdown (nbsp/ZWSP) when viewing body outside Sapie — document for future MCP/search.
- **Search / diff noise** if nbsp paragraphs multiply.
- **MDXEditor upgrades** may change export shape — keep tests on helper functions, plus one `RichNoteBodyEditor` smoke if
  feasible in `mdxeditor` Jest project.
- **initialMarkdownNormalize** may fire after load; ensure baseline/autosave in `NoteEditorPage` uses **prepared** string
  consistently so autosave does not treat spacer insertion as user edit storm.

**Verification**

- `cd packages/web && pnpm format && pnpm lint && pnpm verify:all && pnpm test`
- Manual: note with `abc`, blank line, `abc` → wait for saved → hard reload → gap remains.

## References

- Investigation thread (Cursor): MDXEditor vs demo styling; blank-line round-trip analysis (2026-06).
- [MDXEditor — Content styling](https://mdxeditor.dev/editor/docs/content-styling)
- [MDXEditor issue #920 — blockquote empty lines](https://github.com/mdx-editor/editor/issues/920) (related class of bug, fixed in 3.54+)
- Vendor repos (local): `~/dev/vendor/mdx-editor` — `editor/src/plugins/core/MdastParagraphVisitor.ts`, `MDXEditor.tsx` `defaultTranslation` / export `trim()`.
- [Story 67: Rich note content editor (MDXEditor)](../../4-in-progress/67-story-rich_note_content_editor_mdx.md)
