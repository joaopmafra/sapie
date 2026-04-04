# Content Versioning

## Table of Contents

- [Context & Decisions](#context--decisions)
- [Version Snapshot Model](#version-snapshot-model)
- [Actor Identification](#actor-identification)
- [Storage Architecture](#storage-architecture)
- [Retention Policy](#retention-policy)
- [Soft-Delete and Trash](#soft-delete-and-trash)
- [Operation Log](#operation-log)
- [Diff Visualization](#diff-visualization)
- [Agent Changeset Approval Flow](#agent-changeset-approval-flow)
- [Implementation Sequence](#implementation-sequence)

---

## Context & Decisions

### Why This Feature Exists

Content versioning is motivated primarily by the introduction of the **MCP server**, which allows AI agents (e.g.,
Cursor) to create, edit, rename, and delete content on behalf of the user. AI agents can make many writes in a single
session, produce plausible-looking but subtly wrong content, and cause damage that the user might not notice until
hours or days later.

The goal is not to prevent agent mistakes — agents will make mistakes. The goal is to make every agent mistake
**recoverable**.

Two independent problems need separate solutions:

| Problem | Solution |
|---|---|
| Agent writes wrong content to a note | Version snapshots (restore previous content) |
| Agent deletes content | Soft-delete and trash (recover deleted items) |
| Agent restructures the content tree | Operation log (audit trail of structural changes) |

### What Was Considered and Settled

**What triggers a version snapshot?**
Two triggers were considered: pre-agent-operation snapshots and continuous human auto-save snapshots (like Google
Docs). The settled design uses:

- **Agent writes**: always create a pre-operation snapshot. This is the primary safety mechanism.
- **Manual checkpoint**: the user can explicitly create a named version at any time.
- **Human auto-save versions**: deferred. The future design will use a heuristic combining edit distance since the
  last snapshot and time elapsed (e.g., snapshot if ≥200 characters changed AND ≥5 minutes since last snapshot).
  This avoids snapshotting every minor correction while capturing significant rewrites.

**Where does versioning responsibility live?**
The **API enforces versioning**, not the MCP server. Any write to a versioned endpoint creates a pre-operation
snapshot automatically. This ensures the safety net cannot be bypassed by a buggy or future MCP server
implementation. The MCP server does not need to call a separate "create version" endpoint — it just writes, and
the API handles the rest.

**Approval flow (agent changeset review):**
An approval flow — where the user reviews and approves agent changes before they are applied (similar to Cursor's
diff review) — is a planned feature. It is explicitly **not part of this versioning story**. Versioning (snapshots
+ soft-delete) provides recovery after the fact. The approval flow provides prevention before the fact. The
sequencing is:

1. Implement versioning (this document)
2. Ship MCP server (with versioning as the safety net)
3. Implement the approval/changeset flow as the next iteration

See [Agent Changeset Approval Flow](#agent-changeset-approval-flow) for the planned design.

---

## Version Snapshot Model

### What Is Versioned

For the initial implementation, versioning covers **note content and name**. Other content types (flashcard decks,
cards) will be added in subsequent iterations as the MCP server gains the ability to modify them.

Structural operations (creating, moving, or deleting content items in the tree) are handled by the
[Operation Log](#operation-log), not by content versioning.

### Version Metadata

Each version is a Firestore document in a subcollection of the content item:

```
contents/{contentId}/versions/{versionId}
```

```typescript
interface ContentVersion {
  id: string;
  versionNumber: number;          // Monotonically increasing per content item
  contentUrl: string;             // Cloud Storage path to the snapshotted content
  name: string;                   // Name of the content item at this version
  size: number;                   // Content size in bytes
  createdAt: Timestamp;

  // Actor information
  actor: VersionActor;

  // Optional user-provided label for manual checkpoints
  label?: string;
}

interface VersionActor {
  type: 'human' | 'agent';
  userId: string;                 // Firebase Auth UID (always present)
  agentName?: string;             // e.g. 'cursor', 'claude' (present when type = 'agent')
  sessionId?: string;             // Groups versions created in the same agent session
}
```

### Snapshot Timing

A pre-operation snapshot is created **before** any write that changes the content body or name. The API checks
whether a snapshot is needed before applying the write:

```
API receives write request
  → Read current content
  → Create version snapshot (store current content to Cloud Storage, write metadata to Firestore)
  → Apply the write
  → Return response
```

If the snapshot creation fails, the write is rejected. The snapshot and the write are not truly atomic (Firestore
and Cloud Storage cannot participate in a single transaction), but the failure mode is safe: if the snapshot
succeeds but the write fails, you have an extra version with no corresponding change. If the snapshot fails, the
write never happens.

### Manual Checkpoints

The note editor exposes a "Save version" action. This creates a version with `actor.type = 'human'` and prompts
the user for an optional label (e.g., "Before AI reorganization", "Good draft"). Manual checkpoints are never
subject to the retention pruning rules applied to auto-generated versions — they are kept indefinitely unless
explicitly deleted by the user.

---

## Actor Identification

The API determines the actor type from an `X-Actor` header included in MCP server requests:

```
X-Actor-Type: agent
X-Actor-Name: cursor
X-Actor-Session: <session-uuid>
```

These headers are set by the MCP server on every request. The API validates that:
- The Firebase Auth token is valid (standard auth check)
- The authenticated user owns the content being modified

The `X-Actor` header is **trusted metadata**, not an authentication mechanism. A user could include it in
their own requests, but that would only affect their own content (which they own anyway) and would label their
versions as agent-created (no security concern).

When `X-Actor-Type: agent` is present, the API applies the stricter versioning policy: always snapshot, tag with
agent name and session ID. When the header is absent, the request is treated as a human write.

The `sessionId` groups all versions created by a single agent session, making it easy to see "everything this
Cursor session changed" in the version history UI.

---

## Storage Architecture

Version content is stored in Cloud Storage alongside the live content:

```
/{ownerId}/content/{contentId}/live          ← current content
/{ownerId}/content/{contentId}/versions/{versionId}   ← snapshot
```

Version metadata (the `ContentVersion` document) is stored in Firestore as a subcollection:

```
contents/{contentId}/versions/{versionId}
```

This mirrors the existing architecture: Firestore for metadata and queryable fields, Cloud Storage for content
blobs. Version metadata documents are small and numerous, making Firestore the right fit. Version content blobs
are binary and append-only, making Cloud Storage the right fit.

**Restoration process:**
1. User selects a version to restore
2. API copies the version's Cloud Storage object to the live path
3. API updates the Firestore metadata (name, contentUrl, updatedAt)
4. API creates a new version snapshot *of the current live content* before overwriting it
   (so restoration itself is reversible)

---

## Retention Policy

Two separate retention rules apply, evaluated independently:

### Human and Manual Checkpoint Versions

| Type | Retention |
|---|---|
| Manual checkpoints (labeled) | Kept indefinitely — never pruned automatically |
| Human auto-save versions (future) | Keep the most recent 10; prune older ones |

### Agent Versions

Agent versions follow a stricter retention rule to ensure the user can always roll back MCP-induced changes
even after subsequent human edits:

- Keep the **5 most recent agent-session snapshots** regardless of how many human saves occurred between them
- An "agent-session snapshot" is defined as the first snapshot created with a given `sessionId`
  (subsequent writes within the same session share a session ID; only the first counts toward the retention limit)

**Pruning:** A Cloud Function runs daily and enforces retention rules by deleting versions (both Firestore
metadata and Cloud Storage objects) beyond the configured limits.

**Configurable limits:** Both the human and agent retention counts are stored in user preferences and can be
adjusted. Defaults: 10 human, 5 agent.

---

## Soft-Delete and Trash

### Mechanism

Deleting any content item sets a `deleted: true` flag and a `deletedAt` timestamp on the Firestore document.
The item is removed from all normal content queries but remains in the database.

```typescript
interface SoftDeleteFields {
  deleted: boolean;
  deletedAt?: Timestamp;
  deletedBy: VersionActor;      // Same actor structure as versions
}
```

The content item is not removed from Cloud Storage at delete time. Permanent deletion (Cloud Storage + Firestore)
happens after the trash retention period expires (default: 30 days), enforced by a Cloud Function.

### Cascading

Deleting a folder soft-deletes the folder and all descendants recursively. The `deletedAt` timestamp is set to
the same value on all affected items (the moment the delete was initiated), making it possible to restore the
entire group atomically by querying `WHERE deletedAt = {timestamp}`.

Restoring a folder from trash restores all items with the same `deletedAt` timestamp, preserving the original
hierarchy. If a restored item's parent was independently deleted (by a separate operation), the restored item is
moved to the root directory.

### Trash UI

A "Trash" section is accessible from the navigation drawer. It shows all soft-deleted items for the current user,
grouped by deletion event (same `deletedAt` timestamp = same deletion). Each group shows:
- What was deleted (item name, type, number of descendants)
- When it was deleted
- Who deleted it (human or agent name)
- "Restore" and "Delete permanently" actions

---

## Operation Log

Structural operations that cannot be captured by content versioning are recorded in an operation log:

```
operationLog/{logEntryId}
```

```typescript
interface OperationLogEntry {
  id: string;
  timestamp: Timestamp;
  actor: VersionActor;
  operation: 'create' | 'move' | 'delete' | 'restore';
  contentId: string;
  contentType: string;
  contentName: string;

  // For 'move' operations
  fromParentId?: string;
  toParentId?: string;

  // For operations involving multiple items (e.g., folder delete)
  affectedIds?: string[];

  // For agent sessions: groups related operations
  sessionId?: string;
}
```

The operation log is append-only. Entries are never deleted automatically (they are a permanent audit trail).

The log supports the future **agent changeset approval flow** by grouping operations by `sessionId`. When the
approval flow is implemented, pending operations will be held in the log with a `status: 'pending'` field until
the user approves or rejects them.

---

## Diff Visualization

The version history panel in the note editor shows diffs between any two versions of a note's content.

**Scope:** Markdown content only. Rich text diffing (rendered HTML) is deferred — markdown diff is significantly
simpler to implement and renders well in a side-by-side or inline format.

**Library:** [`diff`](https://github.com/kpdecker/jsdiff) (or equivalent) produces a character-level or
line-level diff of the markdown source. Line-level diff is preferred for readability.

**UI:**
- Version history panel shows a list of versions (timestamp, actor, label if present)
- Selecting two versions shows an inline diff (additions in green, deletions in red)
- "Restore this version" button applies the restoration described in [Storage Architecture](#storage-architecture)
- The current live content is always shown as the most recent entry in the list

---

## Agent Changeset Approval Flow

> **Status: planned, not part of this implementation.** This section documents the intended design for the next
> iteration after the MCP server ships.

The approval flow allows the user to review and approve or reject agent-proposed changes before they are applied,
analogous to Cursor's file diff review.

### Concept

Instead of applying writes immediately, the MCP server can operate in **draft mode**: it creates a changeset
(a group of pending operations) and presents it to the user for review. The user approves (apply all), rejects
(discard all), or selectively approves individual operations. Approved operations are applied atomically.

### Changeset Structure

```
changesets/{changesetId}
  operations/{operationId}
```

Each operation holds:
- The operation type (write content, rename, move, delete)
- The current value (for diff rendering)
- The proposed value
- Status: `pending` | `approved` | `rejected`
- A reference to the pre-operation version snapshot (created when the operation is applied)

### MCP Server Modes

| Mode | Behaviour |
|---|---|
| `immediate` | Writes are applied immediately; versioning provides recovery |
| `draft` | Writes create a pending changeset; applied only after user approval |

The default mode is configurable per-user. Destructive operations (delete, bulk rename) can be configured to
always require approval regardless of mode.

### Relationship to Versioning and Operation Log

The changeset and operation log are complementary:
- The operation log records what *was applied* (past tense, always)
- A changeset records what *is proposed* (present tense, pending approval)
- When a changeset is approved and applied, its operations are written to the operation log
- Pre-operation snapshots are created at apply time (not draft time)

---

## Implementation Sequence

### Phase 1 — Implement alongside the MCP server (required before MCP server goes live)

1. **Firestore schema**: `versions` subcollection on `contents`, `operationLog` top-level collection,
   `deletedAt`/`deleted` fields on `contents`
2. **API: pre-operation snapshots** on note content write and rename endpoints
3. **API: actor identification** via `X-Actor` headers
4. **API: soft-delete** on all content type delete endpoints (cascading for folders)
5. **API: restoration** endpoint (restore version, restore from trash)
6. **API: operation log** writes on create/move/delete/restore
7. **API: retention pruning** Cloud Function (daily)
8. **API: trash expiry** Cloud Function (permanent delete after 30 days)
9. **UI: version history panel** in note editor (list + restore)
10. **UI: diff view** for markdown content
11. **UI: manual checkpoint** action in note editor
12. **UI: trash view** in navigation drawer

### Phase 2 — Agent changeset approval flow (after MCP server ships)

1. Changeset data model and API endpoints (create/approve/reject)
2. MCP server draft mode support
3. Changeset review UI
4. Mandatory approval for destructive operations (configurable)
