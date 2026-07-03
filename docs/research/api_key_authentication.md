# API Key Authentication

## Motivation

The CLI currently requires Firebase Auth (email/password or Google OAuth) to obtain ID tokens.
This requires the CLI to carry Firebase web API keys and a full OAuth flow, even for headless/automated use.

**Goal:** Allow authentication with a single long-lived API key (`sapie login --api-key <key>`),
eliminating Firebase config from the CLI entirely. The API key is a Bearer token sent directly
to the Sapie API.

## Current state

- **API authentication:** `AuthGuard` in `packages/api/src/auth/auth.guard.ts` validates
  Firebase ID tokens via `FirebaseAdminService.verifyIdToken()`. No API key mechanism exists.
- **CLI authentication:** Firebase REST API (`identitytoolkit.googleapis.com`) with
  `AuthService` (email/password or Google OAuth). Tokens stored in `.sapie/auth.json`.

## Design

### Web app: API key management

- New "API Keys" page under Settings.
- **Generate key:** user clicks "Create API Key", a UUID v4 is generated, displayed once,
  and a SHA-256 hash is stored in Firestore:
  - Collection: `users/{userId}/apiKeys/{keyId}`
  - Fields: `name` (user label), `hash` (SHA-256 of key), `createdAt`, `lastUsedAt`
- **Revoke key:** delete the Firestore document.
- Key is shown **once** — user must copy it immediately (standard API key UX).

### API: key validation

- New `ApiKeyGuard` (or chain in existing `AuthGuard`):
  1. Extract `Authorization: Bearer <token>` header.
  2. If the token starts with `sapie-key-`, treat as API key; otherwise delegate to existing Firebase token validation.
  3. Hash the key with SHA-256; look up `users/{userId}/apiKeys` by hash.
  4. If found, set `req.user` from the parent user doc. Update `lastUsedAt`.
- User ID is derived from the key lookup, not from a JWT — the key itself identifies the user.

### CLI: key-based login

- New command: `sapie login --api-key <key>`
- Stores `{ apiKey: "<key>" }` in `.sapie/auth.json` (same file, new field).
- All API calls send `Authorization: Bearer <key>` with the `sapie-key-` prefix.
- No Firebase config needed — `.sapie/config.json` only needs `apiBaseUrl`.
- Future: `sapie init` auto-detects if apiKey is set and skips Firebase auth flow entirely.

## Migration path

1. Implement API key management in web app and API key validation in API.
2. Add `--api-key` to `sapie login`.
3. Eventually make API key the default auth method for CLI; Firebase auth becomes secondary.

## Deferred

This is tracked as **Story 76**. Implementation deferred until after MVP study features
(flashcard decks, study mode, study tracking).
