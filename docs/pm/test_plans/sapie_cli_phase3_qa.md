# Sapie CLI Phase 3 — Manual QA Test Plan

**Date:** 2026-07-02
**Scope:** Lock API endpoints, lock-integrated push, parallel pull, CLI regression, web app regression
**Prerequisite:** Local dev environment running (`bash scripts/dev-local.sh` or equivalent)

---

## 0. Environment Setup

### 0.1 Start local dev emulators (API + Web + Firebase emulators)

```bash
cd ~/dev/joaopmafra/apps/knowledge-management/sapie
bash scripts/dev-local.sh
```

Wait for all three services:
- Emulator UI at http://localhost:4002
- Web at http://localhost:5173 (Vite default)
- API at http://localhost:3000 (NestJS default)

If the API or Web doesn't start automatically, run manually in separate terminals:

```bash
# Terminal 2 — API
cd packages/api && pnpm run dev:local

# Terminal 3 — Web
cd packages/web && pnpm run dev:local
```

### 0.2 Build and link the CLI

```bash
cd packages/cli
pnpm run link:global
```

Now \`sapie\` is available globally in any terminal.
Verify with:

```bash
sapie --version
```


### 0.3 Create a test workspace (using `sapie init`)

```bash
export TEST_WS=$(mktemp -d)

sapie init --workspace "$TEST_WS" \
  --api-base-url "http://localhost:3000/api" \
  --firebase-api-key "fake-api-key" \
  --firebase-auth-domain "sapie-dev.firebaseapp.com" \
  --auth-emulator-host "localhost:9100"
```

**Expected:** Creates `.sapie/config.json`, `AGENTS.md`, and `.gitignore` in `$TEST_WS`.

### 0.4 Create a test user in the Auth emulator

The local dev emulator has Auth on port 9100. Use the Firebase Auth REST API:

```bash
# Create test user
curl -s -X POST "http://localhost:9100/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test1234","returnSecureToken":true}'

# Get a token for subsequent API calls
TOKEN=$(curl -s -X POST "http://localhost:9100/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake-api-key" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test1234","returnSecureToken":true}' | python3 -c "import sys,json; print(json.load(sys.stdin)['idToken'])")
```

---

## 1. Lock API Endpoints (Backend)

All lock endpoints at `/api/sync/lock`. API runs at `http://localhost:3000`.

### 1.1 Acquire lock (happy path)

```bash
curl -s -X POST http://localhost:3000/api/sync/lock \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"instanceId":"test-instance-1"}' | python3 -m json.tool
```

**Expected:** HTTP 201. Response fields: `ownerId`, `lockedAt` (ISO 8601), `expiresAt` (~5 min from now), `instanceId: "test-instance-1"`, `locked: true`, `operation: "sync-push"`.

### 1.2 Acquire lock when already held (409 conflict)

```bash
curl -s -X POST http://localhost:3000/api/sync/lock \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"instanceId":"test-instance-2"}' | python3 -m json.tool
```

**Expected:** HTTP 409. `title: "Sync Lock Conflict"`, `status: 409`, `instanceId: "test-instance-1"`, `expiresAt` present.

### 1.3 Check lock status

```bash
curl -s http://localhost:3000/api/sync/lock \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**Expected:** HTTP 200. `locked: true`, `lock.instanceId: "test-instance-1"`.

### 1.4 Release lock (happy path)

```bash
curl -s -X DELETE "http://localhost:3000/api/sync/lock?instanceId=test-instance-1" \
  -H "Authorization: Bearer $TOKEN" -w "\nHTTP %{http_code}\n"
```

**Expected:** HTTP 204 No Content (empty body).

### 1.5 Release lock with wrong instance (403)

Re-acquire first, then try with wrong instance:

```bash
curl -s -X POST http://localhost:3000/api/sync/lock \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"instanceId":"test-instance-1"}' > /dev/null

curl -s -X DELETE "http://localhost:3000/api/sync/lock?instanceId=wrong-instance" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**Expected:** HTTP 403. `title: "Sync Lock Mismatch"`, `instanceId: "test-instance-1"`.

### 1.6 Force-release lock

```bash
curl -s -X DELETE "http://localhost:3000/api/sync/lock?force=true" \
  -H "Authorization: Bearer $TOKEN" -w "\nHTTP %{http_code}\n"
```

**Expected:** HTTP 204.

### 1.7 Verify lock is gone

```bash
curl -s http://localhost:3000/api/sync/lock \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**Expected:** `locked: false`, `lock: null`.

### 1.8 Release when no lock exists (idempotent)

```bash
curl -s -X DELETE "http://localhost:3000/api/sync/lock?instanceId=any-instance" \
  -H "Authorization: Bearer $TOKEN" -w "\nHTTP %{http_code}\n"
```

**Expected:** HTTP 204.

### 1.9 Unauthorized access (no token)

```bash
curl -s -X POST http://localhost:3000/api/sync/lock \
  -H "Content-Type: application/json" \
  -d '{"instanceId":"test"}' -w "\nHTTP %{http_code}\n"
```

**Expected:** HTTP 401.

### 1.10 Lock expiry (manual)

1. Acquire a lock (1.1)
2. Open Emulator UI at http://localhost:4002 → Firestore → `locks` collection
3. Find the document with your user ID, edit `expiresAt` to a past timestamp
4. Acquire lock again with a new instanceId

**Expected:** Second acquire succeeds (HTTP 201) — expired lock was overwritten.

---

## 2. CLI — Push with Lock Integration

### 2.1 Setup: pull first

```bash
sapie login --workspace "$TEST_WS" --method email
# Enter: test@example.com / test1234

sapie pull --workspace "$TEST_WS"
```

**Expected:** Login succeeds. Pull creates `My Contents/` directory.

### 2.2 Push with lock (happy path)

```bash
mkdir -p "$TEST_WS/My Contents/Test Note.md"
echo "# Hello from QA" > "$TEST_WS/My Contents/Test Note.md/index.md"

sapie push --workspace "$TEST_WS"
```

**Expected:** `✓ Pushed: 1 created, 0 updated, 0 renamed, 0 deleted, 0 deck card changes`. Lock is released afterwards.

### 2.3 Push when lock is held (409 conflict)

```bash
# Manually acquire a lock with a different instance
curl -s -X POST http://localhost:3000/api/sync/lock \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"instanceId":"another-cli"}' > /dev/null

# Try pushing
sapie push --workspace "$TEST_WS"
```

**Expected:** Error: "Lock conflict: another push is in progress (instance another-cli, expires ...). Use --abort to force-release a stale lock." No changes pushed.

### 2.4 Push --abort (force-release stale lock)

```bash
sapie push --workspace "$TEST_WS" --abort
```

**Expected:** "Force-releasing sync lock..." → "✓ Lock released."

### 2.5 Push after --abort (lock cleared)

```bash
sapie push --workspace "$TEST_WS"
```

**Expected:** Push succeeds normally.

---

## 3. CLI — Pull with Parallel Downloads

### 3.1 Pull with multiple notes

```bash
rm -rf "$TEST_WS/My Contents"
rm -f "$TEST_WS/.sapie/state.json"
sapie pull --workspace "$TEST_WS"
```

**Expected:** Pull completes. All notes have `index.md`. State file created.

### 3.2 Pull idempotency

```bash
sapie pull --workspace "$TEST_WS"
```

**Expected:** Second pull reports 0 created, all unchanged (if no remote changes).

---

## 4. CLI — Regression

### 4.1 `sapie login --method email`

```bash
sapie login --workspace "$TEST_WS" --method email
# test@example.com / test1234
```

**Expected:** "Logged in as test@example.com"

### 4.2 `sapie logout`

```bash
sapie logout --workspace "$TEST_WS"
```

**Expected:** "Logged out."

### 4.3 `sapie status`

```bash
sapie status --workspace "$TEST_WS"
```

**Expected:** Dry-run change report. Clean workspace → "No changes" or equivalent.

### 4.4 `sapie deck` lifecycle

```bash
NOTE="My Contents/Test Note.md/"
sapie deck create "$NOTE" --name "QA Deck" --workspace "$TEST_WS"
sapie deck ls "$NOTE/decks/QA Deck.json" --workspace "$TEST_WS"
sapie deck add "$NOTE/decks/QA Deck.json" --front "Q1" --back "A1" --workspace "$TEST_WS"
sapie deck add "$NOTE/decks/QA Deck.json" --front "Q2" --back "A2" --workspace "$TEST_WS"
sapie deck edit "$NOTE/decks/QA Deck.json" --index 1 --front "Updated Q" --workspace "$TEST_WS"
sapie deck rm "$NOTE/decks/QA Deck.json" --index 2 --workspace "$TEST_WS"
sapie deck ls "$NOTE/decks/QA Deck.json" --workspace "$TEST_WS"
```

**Expected:** Each subcommand succeeds. Final `ls` shows 1 card ("Updated Q" / "A1").
### 4.5 `sapie init` (fresh workspace)

```bash
export FRESH_WS=$(mktemp -d)
sapie init --workspace "$FRESH_WS" \
  --api-base-url "http://localhost:3000/api" \
  --firebase-api-key "fake-api-key"

# Verify files were created
ls -la "$FRESH_WS/.sapie/config.json"
ls -la "$FRESH_WS/AGENTS.md"
ls -la "$FRESH_WS/.gitignore"

# Verify idempotency — second run should skip existing files
sapie init --workspace "$FRESH_WS" \
  --api-base-url "http://localhost:3000/api" \
  --firebase-api-key "fake-api-key"

# Cleanup
rm -rf "$FRESH_WS"
```

**Expected:** First run creates all three files. Second run prints "already exists — skipping" for each.

### 4.6 Help text

```bash
sapie --help
sapie init --help
sapie push --help
sapie pull --help
sapie status --help
sapie deck --help
```

**Expected:** `push --help` shows `--abort` flag. `init --help` shows all config options. All commands show descriptions.
---

## 5. Web App — Regression

Open http://localhost:5173. Log in with test@example.com / test1234.

### 5.1 Create and edit a note
- Create a note with markdown content
- Edit and wait for auto-save
- Refresh → content persists

### 5.2 Create a folder
- Right-click sidebar → New Folder → folder appears

### 5.3 Create a deck
- Open a note → Add Deck → deck created with cards

### 5.4 Delete content
- Right-click note/folder → Delete → item disappears

---

## 6. End-to-End: CLI ↔ Web Round-Trip

### 6.1 Web → CLI → Web

1. In web: create note "RoundTrip" with body `# E2E Test`
2. `sapie pull --workspace "$TEST_WS"`
3. Verify `$TEST_WS/My Contents/RoundTrip.md/index.md` contains `# E2E Test`
4. Edit local file: change to `# E2E Test — Modified`
5. `sapie push --workspace "$TEST_WS"`
6. Refresh web → open "RoundTrip"

**Expected:** Web shows "E2E Test — Modified"

### 6.2 CLI → Web → CLI (delete)

1. Delete `$TEST_WS/My Contents/RoundTrip.md/` directory
2. `sapie push --workspace "$TEST_WS"`
3. Verify note gone from web sidebar
4. `sapie pull --workspace "$TEST_WS"`
5. Verify `RoundTrip.md/` NOT recreated locally

**Expected:** Deletion propagates local → remote → local stays deleted.

---

## 7. Edge Cases

### 7.1 Push without state file

```bash
rm -f "$TEST_WS/.sapie/state.json"
sapie push --workspace "$TEST_WS"
```

**Expected:** "No .sapie/state.json found — run `sapie pull` first."

### 7.2 Push/Pull/Status without authentication

```bash
sapie logout --workspace "$TEST_WS"
sapie push --workspace "$TEST_WS"
sapie pull --workspace "$TEST_WS"
sapie status --workspace "$TEST_WS"
```

**Expected:** Each shows "Not authenticated. Run `sapie login` first."

### 7.3 Lock crash recovery

1. Acquire lock via curl (1.1)
2. Try acquiring with different instance → 409
3. Wait 5 min (or manually expire in Firestore UI)
4. Acquire again → succeeds (HTTP 201)

**Expected:** Stale locks auto-expire and are overwritable.

---

## 8. Cleanup

```bash
curl -s -X DELETE "http://localhost:3000/api/sync/lock?force=true" \
  -H "Authorization: Bearer $TOKEN" > /dev/null
rm -rf "$TEST_WS"
```

---

## Results

| # | Test | Status | Notes |
|---|------|--------|-------|
| 1.1 | Acquire lock (201) | ⬜ | |
| 1.2 | Acquire lock (409 conflict) | ⬜ | |
| 1.3 | Check lock status | ⬜ | |
| 1.4 | Release lock (204) | ⬜ | |
| 1.5 | Release wrong instance (403) | ⬜ | |
| 1.6 | Force-release (204) | ⬜ | |
| 1.7 | Lock gone after release | ⬜ | |
| 1.8 | Release when no lock (204) | ⬜ | |
| 1.9 | Unauthorized (401) | ⬜ | |
| 1.10 | Lock expiry overwrite | ⬜ | |
| 2.1 | Setup: pull | ⬜ | |
| 2.2 | Push with lock (happy path) | ⬜ | |
| 2.3 | Push when lock held (409) | ⬜ | |
| 2.4 | Push --abort | ⬜ | |
| 2.5 | Push after --abort | ⬜ | |
| 3.1 | Pull multiple notes | ⬜ | |
| 3.2 | Pull idempotency | ⬜ | |
| 4.1 | Login (email) | ⬜ | |
| 4.2 | Logout | ⬜ | |
| 4.3 | Status | ⬜ | |
| 4.4 | Deck lifecycle | ⬜ | |
| 4.5 | sapie init (fresh workspace) | ⬜ | |
| 4.6 | Help text | ⬜ | |
| 5.1 | Web create/edit note | ⬜ | |
| 5.2 | Web create folder | ⬜ | |
| 5.3 | Web create deck | ⬜ | |
| 5.4 | Web delete content | ⬜ | |
| 6.1 | Web → CLI → Web round-trip | ⬜ | |
| 6.2 | CLI → Web → CLI delete | ⬜ | |
| 7.1 | Push without state file | ⬜ | |
| 7.2 | No auth (push/pull/status) | ⬜ | |
| 7.3 | Lock crash recovery | ⬜ | |
