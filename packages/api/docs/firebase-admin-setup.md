# Firebase Admin SDK setup (API)

The Firebase Admin SDK is provided as a NestJS **`FirebaseAdminModule`** / **`FirebaseAdminService`** under
`src/firebase/`.

**What the code does today:** `FirebaseAdminService` calls
`admin.initializeApp({ projectId: process.env.GCLOUD_PROJECT })`
once (reusing an existing `admin` app if present). It does **not** branch on `FUNCTIONS_EMULATOR` for initialization.
Credentials and emulator routing follow the **Firebase Admin SDK defaults**: Application Default Credentials on GCP, and
when **`FIREBASE_AUTH_EMULATOR_HOST`** / **`FIRESTORE_EMULATOR_HOST`** are set, the SDK talks to those emulators.
**Storage** (including `getStorage()`) respects **`FIREBASE_STORAGE_EMULATOR_HOST`** when set.

**Cloud Storage signed URLs** (IAM, bucket CORS): [firebase-gcp-storage.md](./firebase-gcp-storage.md).

Deeper Nest patterns and auth
usage: [NestJS Firebase Integration Guide](../../../docs/other/nestjs_firebase_integration.md).

## Environments

| Scenario                                            | Typical credentials / config                                                                                                    |
|-----------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------|
| **Firebase Functions (production)**                 | ADC from the runtime; **`GCLOUD_PROJECT`** set by the platform                                                                  |
| **Emulators or hybrid local**                       | **`GCLOUD_PROJECT`** set explicitly (e.g. `demo-local-dev`); emulator host env vars (see below). No JSON key file in code paths |
| **Local `pnpm run dev` against a real GCP project** | **`gcloud auth application-default login`** (or other ADC your machine provides). Same `initializeApp` shape                    |

`FUNCTIONS_EMULATOR` is set by the Functions emulator and is used elsewhere (e.g. Swagger in `firebase-functions.ts`);
it
does **not** toggle Admin SDK initialization in `FirebaseAdminService`.

### Production

Firebase Functions / Cloud Run supply ADC and project metadata; the app still relies on **`GCLOUD_PROJECT`** (or
platform equivalents) being present for `initializeApp`.

### Emulators (recommended for day-to-day dev)

Set **`GCLOUD_PROJECT`** to your emulated project id and point the Admin SDK at emulators with host env vars (see
**`.env.local-dev.example`**, **`.env.test-unit`**, etc.):

- **`FIREBASE_AUTH_EMULATOR_HOST`** — e.g. `localhost:9100` (hybrid local) or `localhost:9099` (full stack)
- **`FIRESTORE_EMULATOR_HOST`** — e.g. `localhost:8282` or `localhost:8080`
- **`FIREBASE_STORAGE_EMULATOR_HOST`** — e.g. `localhost:9199` for Storage emulator / tests

- **Full stack** (Auth default): **9099** (see root `pnpm run emulator`).
- **Hybrid local** (`CURRENT_ENV=local-dev`): Auth **9100**, Firestore **8282** (see `firebase.local-dev.json` and
  `packages/api/.env.local-dev.example`).

### Service account JSON key file

`FirebaseAdminService` previously had a **`FIREBASE_SERVICE_ACCOUNT_KEY_PATH`** / `credential.cert()` path; it is
**commented out** and **not active**. To hit a real Firebase/GCP project from your laptop, use **ADC**
(`gcloud auth application-default login`) unless you add explicit cert initialization back into the service.

## Environment variables

| Variable                         | Description                                         | When                                                                                    |
|----------------------------------|-----------------------------------------------------|-----------------------------------------------------------------------------------------|
| `GCLOUD_PROJECT`                 | Firebase / GCP project id passed to `initializeApp` | Required for consistent Admin behavior (set manually in `.env.*` when not on Functions) |
| `FIREBASE_AUTH_EMULATOR_HOST`    | `host:port` for Auth emulator                       | Hybrid local / emulators                                                                |
| `FIRESTORE_EMULATOR_HOST`        | `host:port` for Firestore emulator                  | Hybrid local / emulators                                                                |
| `FIREBASE_STORAGE_EMULATOR_HOST` | `host:port` for Storage emulator                    | Tests / local when using Storage emulator                                               |
| `FUNCTIONS_EMULATOR`             | `true` when running on the Functions emulator       | Auto on emulator; used outside `FirebaseAdminService`                                   |
| `NODE_ENV`                       | `production` / `development`                        | Recommended                                                                             |
| `FIREBASE_STORAGE_BUCKET`        | Override default GCS bucket name                    | Optional; see API README Cloud Storage section                                          |
| `FIREBASE_CONFIG`                | JSON with `storageBucket` etc.                      | Set on Functions / emulator for bucket resolution                                       |

## Using Firebase in code

Inject `FirebaseAdminService` and call `verifyIdToken`, `getUserByUid`, `getFirestore()`, **`getStorage()`**, etc.
Module layout:

```text
src/firebase/
  firebase-admin.module.ts
  firebase-admin.service.ts
  index.ts
```

## Troubleshooting

- **Firebase Admin not initialized**: ensure `FirebaseAdminModule` is imported in `AppModule` and credentials match the
  environment.
- **Project not found / wrong project**: ensure **`GCLOUD_PROJECT`** matches the Firebase project or demo id you intend;
  emulator hosts must match the running Compose / CLI stack.
- **ADC / permission errors against real GCP**: run `gcloud auth application-default login` or deploy to Functions; the
  service does not load a JSON key file unless you restore that code path.
- **Token verification failed**: client and server must use the same Firebase project; emulator ports must match web/API
  config.

Debug logging: `export DEBUG=firebase-admin:*`

## Security

Do not commit service account keys. Prefer emulators for development. Rotate keys if you use them. Prefer
least-privilege
IAM on production service accounts.

## Suggested workflow

1. Develop against emulators (no key).
2. Keep integration tests on emulators where possible.
3. Use a real project with **ADC** only when you must reproduce GCP-only behavior.
4. Production: deploy to Firebase Functions and rely on ADC plus [firebase-gcp-storage.md](./firebase-gcp-storage.md)
   for Storage signing and CORS.
