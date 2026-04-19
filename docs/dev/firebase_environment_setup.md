# Setting up a new Firebase project (environment)

Sapie’s **hosted** tiers (development, staging, production) each use a **real Firebase / GCP project**: Hosting for the
web app, Cloud Functions for the API, **Firebase Auth**, **Cloud Firestore** for content metadata, and **Cloud Storage**
for note bodies. Local and CI flows use the **emulator** project ids instead; they are not covered here.

**Today:** staging maps to **`sapie-b09be`** in [`.firebaserc`](../../.firebaserc) (`staging` alias). The root
[README](../../README.md) environment table lists intended names (`sapie-dev`, `sapie-staging`, `sapie-prod`); when you
add or rename a project, keep **`.firebaserc`**, the README table, and any deployment docs in sync.

---

## 1. Create the Firebase project

1. Open [Firebase Console](https://console.firebase.google.com/) → **Add project** (or attach Firebase to an existing GCP
   project).
2. Enable **Google Analytics** only if you want it for that environment.

**Billing:** Cloud Functions (Gen 2) and related GCP usage usually require the **Blaze** plan for that project. Confirm
billing is acceptable for the environment you are creating.

---

## 2. Enable core products

In the Firebase console for the new project:

1. **Authentication** → Get started → enable **Email/Password** and **Google** (match other Sapie environments). Under
   **Settings → Authorized domains**, add the Hosting domains you will use (e.g. `PROJECT_ID.web.app`,
   `PROJECT_ID.firebaseapp.com`, and any custom domain).
2. **Firestore Database** → Create database (Sapie stores **content** metadata here). Pick a region consistent with
   Storage and Functions. Lock down **security rules** for your policy (development projects may still use strict rules;
   do not rely on “open” rules in production).
3. **Storage** → Get started → default bucket (Sapie stores **content bodies** here). Rules can be restrictive for
   **client SDK** access if the app only reads bodies via **signed URLs** from the API; see
   [ADR 0002](../adr/0002-note-body-storage-and-api.md) and [content naming](content_naming.md).

---

## 3. Register a web app (client config)

**Project settings** → **Your apps** → add a **Web** app. Copy the config values into the Vite env vars for that
environment (see [packages/web/docs/firebase-web.md](../../packages/web/docs/firebase-web.md)): `VITE_FIREBASE_*` and
`VITE_API_BASE_URL` pointing at the deployed Functions URL or your API base path.

For **Google Sign-In**, use [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services →
Credentials** for the same GCP project: OAuth **Web client** — add **Authorized JavaScript origins** and **Authorized
redirect URIs** for each Hosting origin (including `https://PROJECT_ID.web.app` and `/__/auth/handler` paths as
required by Firebase Auth).

---

## 4. Link the repo to the project (CLI)

From the **repository root** (where `firebase.json` lives):

```bash
firebase login
firebase projects:list
firebase use --add   # select the new GCP project id, assign an alias (e.g. staging, prod)
```

Update [`.firebaserc`](../../.firebaserc) so the alias points at the new project id (today: `dev`, `staging`, `prod`).

Deploy (when you are ready to validate):

```bash
./scripts/build-all.sh
firebase deploy --project YOUR_ALIAS
```

See the root [README](../../README.md) deployment section for the usual flow.

---

## 5. GCP-only setup after first deploy (signed URLs + CORS)

The API issues **V4 signed URLs** for note bodies and the browser **fetches** objects from `storage.googleapis.com`.
Each new project needs:

1. **IAM** — runtime service account may use **IAM `signBlob`**; grant **Service Account Token Creator** where needed.
2. **Storage bucket CORS** — so your Hosting origins can read bytes from the default bucket.

Concrete commands and troubleshooting: **[packages/api/docs/firebase-gcp-storage.md](../../packages/api/docs/firebase-gcp-storage.md)**.

---

## 6. Quick verification checklist

- [ ] `firebase use` / `.firebaserc` alias resolves to the intended project.
- [ ] Web build uses the correct `VITE_FIREBASE_*` and API base URL for that project.
- [ ] Auth: sign-in works on the deployed Hosting URL; authorized domains and OAuth client origins match.
- [ ] API health and a smoke path (e.g. create/list content) succeed against deployed Functions.
- [ ] Note with a body: metadata loads, signed URL returns 200, **browser fetch** of the body succeeds (no CORS error).
- [ ] Firestore/Storage rules and IAM match your security expectations for that tier.

---

## Related docs

- [packages/web/docs/firebase-web.md](../../packages/web/docs/firebase-web.md) — web Firebase Auth and env vars.
- [packages/api/docs/firebase-admin-setup.md](../../packages/api/docs/firebase-admin-setup.md) — Admin SDK and emulator
  env vars (for local/hybrid work against a real project).
- [packages/api/docs/firebase-gcp-storage.md](../../packages/api/docs/firebase-gcp-storage.md) — signed URLs, IAM,
  bucket CORS.
- Root [README — Environments](../../README.md#environments) — naming matrix for Sapie tiers.
