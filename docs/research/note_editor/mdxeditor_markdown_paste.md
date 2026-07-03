# MDXEditor — Markdown Paste Support

**Date:** 2026-07-03
**Version:** `@mdxeditor/editor` v3.55.0

## Finding

MDXEditor does **not** natively convert pasted raw markdown text to rich content.
When you paste `# Heading` or `**bold**` from the clipboard, the markdown syntax
appears as literal text — it is not parsed into formatted blocks.

**However**, v3.55.0 ships `MDXEditorMethods.insertMarkdown(value: string)` — a
public API that inserts parsed markdown at the current cursor position. This is a
game changer for paste support: we no longer need deep Lexical integration.

## Root cause

MDXEditor is built on Lexical, a rich-text framework. The clipboard pipeline
processes HTML first, then falls back to plain text. Plain text with markdown
syntax goes through Lexical's default paste handler, which treats it as literal
text — there is no markdown→Lexical AST conversion on paste.

The `markdownShortcutPlugin` handles **typing** shortcuts only (`#␣` → heading
as you type). It does not intercept paste events.

MDXEditor does not expose a native `onPaste` hook (discussion
[#608](https://github.com/mdx-editor/editor/discussions/608)).

## `insertMarkdown` API (v3.55.0 — public)

`MDXEditorMethods.insertMarkdown(markdown: string)` inserts parsed markdown at the
**current cursor position** without replacing the entire document.

```ts
const ref = useRef<MDXEditorMethods>(null);
// ...
ref.current?.insertMarkdown('# Hello\n\n**bold** text');
```

This is distinct from `setMarkdown(markdown: string)`, which **replaces** the
entire document (calls `$getRoot().clear()` first).

### Internal implementation

`insertMarkdown` publishes to the `insertMarkdown$` gurx signal:

```
insertMarkdown(md)                                     // MDXEditor.tsx:247
  → realm.pub(insertMarkdown$, md)                     // core/index.ts:403-429
    → activeEditor.update(() => {
        selection = $getSelection()
        importPoint = { children: [], append(n) { … }, getType() { … } }
        tryImportingMarkdown(r, importPoint, md)        // core/index.ts:676-706
          → importMarkdownToLexical({ root: importPoint, markdown: md, … })
            → fromMarkdown(md) → MDAST root            // mdast-util-from-markdown
            → importMdastTreeToLexical({ root: importPoint, mdastRoot, … })
              → visit mdastRoot → for each child: visitor creates Lexical node
              → lexicalParent.append(node) → collects in importPoint.children
        $insertNodes(importPoint.children)              // Lexical API
      })
```

**$insertNodes** handles selection replacement automatically: it replaces any
selected text with the new nodes, or inserts at the cursor if nothing is selected.
No separate `removeText()` call is needed.

Key steps:

1. **Parse** the markdown string into an MDAST tree via `mdast-util-from-markdown`
2. **Visit** each MDAST node with registered `MdastImportVisitor`s, converting to
   Lexical nodes (paragraphs, headings, lists, bold/italic, links, images, etc.)
3. **Accumulate** the resulting Lexical nodes into a synthetic `ImportPoint` that
   implements `append(node)` and `getType()`
4. **Insert** the collected nodes at the current selection via Lexical's
   `$insertNodes()`, which handles splitting parent nodes at the insertion point

### The `getType()` contract

The import point exposes `getType()`, which returns the type of the **first node
in the current selection** (`selection.getNodes()[0].getType()` —
`core/index.ts:414`). Visitors use this to decide wrapping behavior:

- **Paragraph visitor** (`MdastParagraphVisitor.ts:11`): skips wrapping when
  parent is already a `listitem` or `admonition` — avoids double-wrapping.
- **HTML image visitor** (`MdastImageVisitor.ts:47`): wraps image in a paragraph
  when `lexicalParent.getType() === 'root'`, appends bare image otherwise.

This means pasting `# Heading` inside a paragraph correctly creates a heading
block, and pasting `![alt](url)` at root level gets a paragraph wrapper.

### Two ways to invoke (ref vs. publisher)

**Via ref** (within a React component that holds the MDXEditor ref):

```ts
ref.current?.insertMarkdown('# Hello\n\n**bold** text')
```

This calls `MDXEditor.tsx:247` → `realm.pub(insertMarkdown$, markdown)`.

**Via publisher** (from any component inside the MDXEditor tree, using gurx):

```ts
import { insertMarkdown$, usePublisher } from '@mdxeditor/editor'

const insertMarkdown = usePublisher(insertMarkdown$)
insertMarkdown('# Hello\n\n**bold** text')
```

This is the pattern used in the official `src/examples/insert-markdown.tsx`
example. Both paths converge on the same `insertMarkdown$` signal.

### Lower-level exports (not in public type declarations)

These are in the JS bundle but excluded from the `.d.ts` public API:

- `importMarkdownToLexical({ root, markdown, visitors, ... })` — parse markdown
  into an existing Lexical root node
- `importMdastTreeToLexical({ root, mdastRoot, visitors, ... })` — import an
  already-parsed MDAST tree
- `exportMarkdownFromLexical({ root, ... })` — export Lexical tree to markdown string

## Workarounds

### 1. CLI sync (preferred for bulk import)

Structure markdown files as workspace notes and push:

```
NoteName.md/
  index.md    # the markdown body
```

Then `sapie push` syncs them to the backend. The web app pulls them on next
page load. This is the designed import mechanism.

### 2. Import button in the web UI

Add an "Import Markdown" button to the note editor toolbar. Opens a dialog
with a textarea. On submit, calls `editor.insertMarkdown(pastedText)`.

- **Pro:** Simple, explicit, inserts at cursor without replacing the document
- **Con:** Extra UI interaction (dialog)

Previously this section recommended `setMarkdown()` which replaces the whole
document. With `insertMarkdown()` now available, insertion at cursor is trivial.

### 3. Seamless paste via DOM handler (now practical)

Attach a `paste` event listener to the editor container element. On paste:

1. Read `event.clipboardData.getData('text/plain')`
2. Detect markdown syntax via simple heuristics:
   - Lines starting with `#` (headings)
   - `**`/`__` pairs (bold)
   - `*`/`_` pairs (italic)
   - `- ` / `* ` / `1. ` line starts (lists)
   - `` ``` `` fences (code blocks)
   - `[text](url)` (links)
   - `>` prefixes (blockquotes)
3. If markdown detected: `event.preventDefault()`,
   `richBodyEditorRef.current?.insertMarkdown(text)`
4. If no markdown detected: let the default paste handler run (plain text
   inserted as-is)

**Implementation sketch** (in `RichNoteBodyEditor` or a wrapping hook):

```tsx
const handlePaste = useCallback((e: ClipboardEvent) => {
  const text = e.clipboardData?.getData('text/plain');
  if (!text) return;

  if (looksLikeMarkdown(text)) {
    e.preventDefault();
    e.stopPropagation();
    ref.current?.insertMarkdown(text);
  }
}, []);

// Attach to the contentEditable DOM element
useEffect(() => {
  const el = containerRef.current;
  el?.addEventListener('paste', handlePaste);
  return () => el?.removeEventListener('paste', handlePaste);
}, [handlePaste]);
```

- **Pro:** Seamless — user just pastes; no extra UI
- **Pro:** `insertMarkdown()` handles all parsing, selection, and insertion —
  no low-level Lexical code needed
- **Pro:** `$insertNodes` automatically replaces selected text with pasted
  nodes — pasting over a selection "just works"
- **Con:** Markdown detection heuristic may have false positives (e.g. pasting
  code that happens to contain `#`). Mitigation: could offer a "Paste as plain
  text" escape hatch (hold Shift while pasting → skip markdown detection),
  or make the heuristic stricter.
## Current editor ref access

`NoteEditorPage` already holds `richBodyEditorRef: React.RefObject<MDXEditorMethods | null>`
(line 149 of `NoteEditorPage.tsx`). The ref is passed to `NoteBodyEditor` →
`RichNoteBodyEditor` via the `richEditorRef` prop and forwarded to `<MDXEditor ref={ref} />`.

This means the paste handler can call `richBodyEditorRef.current?.insertMarkdown(text)`
from within `NoteEditorPage`, or we can add the paste listener inside
`RichNoteBodyEditor` where the ref is directly available.

## Decision

**Implement seamless markdown paste** (Option 3 above). The `insertMarkdown` API
makes this trivial — no deep Lexical integration required. The CLI sync path
remains the primary mechanism for bulk import, but in-editor paste is a
significant UX win for daily use (pasting snippets from chat, docs, etc.).

Implementation order:

1. Add `looksLikeMarkdown(text)` heuristic to a shared util
2. Add the `paste` event listener in `RichNoteBodyEditor` (has direct access
   to the internal ref)
3. Wire `insertMarkdown()` call through the ref
4. Test with common markdown patterns: headings, bold, lists, code blocks, links

## References

- [MDXEditor markdown shortcuts docs](https://mdxeditor.dev/editor/docs/markdown-shortcuts) — typing shortcuts only, no paste
- [Paste detection discussion #608](https://github.com/mdx-editor/editor/discussions/608) — no native `onPaste`, workaround via DOM listener
- [MDXEditor overview](https://mdxeditor.dev/editor/docs/overview) — MDAST ↔ Lexical AST bidirectional conversion architecture

**Source-verified (local clone at `/home/jp/dev/vendor/mdx-editor`):**

- `src/MDXEditor.tsx:140-177` — `MDXEditorMethods` interface with `insertMarkdown`
- `src/MDXEditor.tsx:246-248` — `insertMarkdown` calls `realm.pub(insertMarkdown$, markdown)`
- `src/plugins/core/index.ts:403-429` — `insertMarkdown$` signal implementation
- `src/plugins/core/index.ts:676-706` — `tryImportingMarkdown` helper
- `src/importMarkdownToLexical.ts:131-134` — `ImportPoint` interface
- `src/importMarkdownToLexical.ts:210-242` — `importMarkdownToLexical` function
- `src/importMarkdownToLexical.ts:244-347` — `importMdastTreeToLexical` function
- `src/plugins/core/MdastParagraphVisitor.ts:5-25` — `getType()` usage for paragraph skip
- `src/plugins/image/MdastImageVisitor.ts:47` — `getType() === 'root'` check for image wrapping
- `src/plugins/lists/MdastListVisitor.ts:12` — nested list `$isListItemNode` check
- `src/examples/insert-markdown.tsx` — official example using `usePublisher(insertMarkdown$)`
