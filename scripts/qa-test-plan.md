# Sapie — Manual QA Test Plan

Run these steps in order. Each step describes what to do and what to expect.
All commands run from the repo root (`packages/cli/src/index.ts` is relative).

---

## Prerequisites

- Docker running
- Node.js 22+, pnpm installed
- Firebase emulator ports available: 4001, 4002, 8081, 9099, 9199, 9200
- API port 3000 free
- Web port 5173 free

---

## 1. Start the backend

**Start Firebase emulators** (leave running in a terminal):
```
bash scripts/emulator-dev-local-logs.sh
```

**Start the API server** (new terminal):
```
cd packages/api && pnpm run start:dev
```
Listens on `http://localhost:3000`.

**Verify:**
```
curl http://localhost:3000/api/health
```
Expected: `200 OK`.

---

## 2. Start the web app

**Start Vite dev server** (new terminal):
```
cd packages/web && pnpm run dev
```
Listens on `http://localhost:5173`.

**Open browser** at `http://localhost:5173`.

**Create a test user.** Use the emulator Auth UI at `http://localhost:4002` to add a user, then sign in with any email/password.

---

## 3. Seed test data

```
npx tsx scripts/seed-dev-data.ts
```

Expected output:
```
Folders: 6, Notes: 6, Decks: 2, Cards: 7
```

**Verify in browser sidebar:**
- 📁 Computer Science
  - 📁 Data Structures
    - 📝 Arrays (3 cards in deck)
    - 📝 Linked Lists
  - 📁 Algorithms
    - 📝 Sorting (4 cards in deck)
    - 📝 Searching
  - 📁 System Design
    - 📝 Scalability
- 📁 Mathematics
  - 📁 Linear Algebra
    - 📝 Matrices

---

## 4. Note editor

- Click **Arrays** in the sidebar.
  - Expected: Markdown editor opens with DSA content.
- Type some text.
  - Expected: Auto-save indicator shows "Saving..." then "Saved".
- Reload the page.
  - Expected: Changes persist.
- Rename the note (click the name in the editor header).
  - Expected: Sidebar updates with new name.

---

## 5. Folder operations

- Right-click **Data Structures** → **New Folder**.
  - Expected: Modal appears. Enter "Graphs". Folder appears under Data Structures.
- Click the new **Graphs** folder.
  - Expected: Folder page shows name and tags section.
- Add a tag: type "dsa" in the tag input, press Enter.
  - Expected: Tag chip appears. Remove it by clicking the ×.

---

## 6. Flashcard decks and cards

- Click **Arrays** in the sidebar.
  - Expected: Attachments section at the bottom shows "Arrays" deck (link).
- Click the deck name.
  - Expected: Deck view page listing 3 cards (front/back pairs).
- Click **Add Card**.
  - Expected: Form with front/back fields. Fill and submit.
  - Expected: New card appears at the end of the list.
- Click **Study** on the deck page.
  - Expected: Study mode — front side shown first.

---

## 7. Study mode

**Single deck study:**
- In study mode: read the question, click to reveal the answer.
- Click **I know** or **I don't know**.
  - Expected: Next card loads. Progress indicator updates.
- Complete all cards.
  - Expected: Navigates back to deck view.

**Study dashboard:**
- Navigate to the home/root route (`/`).
  - Expected: Shows content roots with due card counts.
  - Data Structures root should show due cards after seeding.

**Folder-level study:**
- Right-click a folder in the sidebar → **Study all**.
  - Expected: Loads all cards from all decks in that folder.

---

## 8. CLI — local workspace copy (sync)

**Build the CLI:**
```
cd packages/cli && pnpm run build
```

**Create a workspace and initialize:**
```
mkdir -p /tmp/sapie-qa && cd /tmp/sapie-qa
npx tsx ../../src/index.ts init
```
- Interactive prompt asks for **email + password** (use the test user from Step 2).
- Expected output:
  ```
  ✓ Created AGENTS.md
  ✓ Created .gitignore
  Workspace initialized at /tmp/sapie-qa
  ✓ Logged in as <email>
  ```

**Pull content from the API:**
```
npx tsx ../../src/index.ts pull
```
- Expected: Downloads all notes, folders, and decks to `/tmp/sapie-qa/`.
  ```
  My Contents/
    Data Structures/
      Arrays.md/index.md
      Arrays.md/decks/Arrays.json
      Linked Lists.md/index.md
    Algorithms/
      Sorting.md/index.md
      Sorting.md/decks/Sorting.json
      Searching.md/index.md
    ...
  ```

**Edit a file locally:**
```
nano "My Contents/Data Structures/Arrays.md/index.md"
```
Change some text and save.

**Check sync status:**
```
npx tsx ../../src/index.ts status
```
- Expected: Flags "Arrays" as **MODIFIED**.

**Push changes back:**
```
npx tsx ../../src/index.ts push
```
- Expected: Uploads the modified note body to the API.

**Verify in browser:**
- Reload the Arrays note in the web app.
  - Expected: Shows the text edited locally.

**Create a new note locally:**
```
mkdir -p "My Contents/Data Structures/Graphs.md"
echo "# Graphs" > "My Contents/Data Structures/Graphs.md/index.md"
npx tsx ../../src/index.ts push
```
- Expected: New "Graphs" note appears in the web sidebar under Data Structures.

---

## 9. Inline image upload

- Open any note in the editor.
- Paste an image from clipboard (Ctrl+V / Cmd+V).
  - Expected: Image uploads and renders inline.
- Reload the page.
  - Expected: Image persists (served from cache with immutability headers).

---

## 10. Content deletion

- **Simple delete:** Create a note (no deck), right-click → Delete.
  - Expected: Note disappears from sidebar.
- **Cascade block:** Create a note with a deck, try to delete without cascade.
  - Expected: Error — "use ?cascade=true".
- **Cascade success:** Delete with cascade enabled.
  - Expected: Note and deck both removed.
- **Folder delete:** Delete a folder containing notes and decks.
  - Expected: All descendants soft-deleted.

---

## Summary

| Feature | Check |
|---------|-------|
| Notes — create, edit, auto-save, rename | ☐ |
| Folders — create, tag, navigate | ☐ |
| Decks — create, list, delete | ☐ |
| Cards — create, edit, delete, reorder | ☐ |
| Study — single deck, folder-level | ☐ |
| Study — result tracking, due counts | ☐ |
| CLI — init, pull, status, push | ☐ |
| CLI — round-trip (local edit → push → web verify) | ☐ |
| Images — upload, persist across reload | ☐ |
| Deletion — cascade enforcement, folder delete | ☐ |
