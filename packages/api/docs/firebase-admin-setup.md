# Firebase Admin SDK setup (API)

The Firebase Admin SDK is provided as a NestJS **`FirebaseAdminModule`** / **`FirebaseAdminService`** under
`src/firebase/`. Initialization follows the environment (production credentials, emulator demo project, or optional
local key file).

**Cloud Storage signed URLs** (IAM, bucket CORS): [firebase-gcp-storage.md](./firebase-gcp-storage.md).

Deeper Nest patterns and auth usage: [NestJS Firebase Integration Guide](../../../docs/other/nestjs_firebase_integration.md).

## Environments

| Scenario | Service account key file | Credentials |
|----------|---------------------------|---------------|
| **Firebase Functions (production)** | Not required | Application Default Credentials |
| **Firebase emulators** (`FUNCTIONS_EMULATOR=true`) | Not required | Demo project, no production data |
| **Local against a real project** | Optional | `FIREBASE_SERVICE_ACCOUNT_KEY_PATH` or `gcloud auth application-default login` |

### Production

Firebase Functions / Cloud Run supply ADC automatically; no manual Firebase bootstrap in code for production.

### Emulators (recommended for day-to-day dev)

With Firebase emulators, the app uses a demo project id and does not need a key file.

- **Full stack** (Auth emulator default): **9099** (see root `pnpm run emulator`).
- **Hybrid local** (`CURRENT_ENV=local-dev`): ports from `firebase.local-dev.json` (Auth **9100**, Firestore **8282**);
  see `packages/api/.env.local-dev.example`.

### Optional: local service account key

Only if you intentionally test against a **real** Firebase project from your machine:

1. Firebase Console → Project settings → Service accounts → **Generate new private key**.
2. Store the JSON outside git.
3. `export FIREBASE_SERVICE_ACCOUNT_KEY_PATH=/path/to/key.json`

Or use **Application Default Credentials** via Google Cloud SDK: `gcloud auth application-default login`.

## Environment variables

| Variable | Description | When |
|----------|-------------|------|
| `FUNCTIONS_EMULATOR` | Set to `true` by the Functions emulator | Auto |
| `NODE_ENV` | `production` / `development` | Recommended |
| `FIREBASE_SERVICE_ACCOUNT_KEY_PATH` | Path to service account JSON | Optional local / tests against real GCP |

## Using Firebase in code

Inject `FirebaseAdminService` and call `verifyIdToken`, `getUserByUid`, `getFirestore()`, etc. Module layout:

```text
src/firebase/
  firebase-admin.module.ts
  firebase-admin.service.ts
  index.ts
```

## Troubleshooting

- **Firebase Admin not initialized**: ensure `FirebaseAdminModule` is imported in `AppModule` and credentials match the environment.
- **Service account key not found**: check `FIREBASE_SERVICE_ACCOUNT_KEY_PATH` and file permissions.
- **Project not found**: emulator must see `FUNCTIONS_EMULATOR=true`; real project must match the key / ADC project.
- **Token verification failed**: client and server must use the same Firebase project; emulator ports must match web/API config.

Debug logging: `export DEBUG=firebase-admin:*`

## Security

Do not commit service account keys. Prefer emulators for development. Rotate keys if you use them. Prefer least-privilege
IAM on production service accounts.

## Suggested workflow

1. Develop against emulators (no key).
2. Keep integration tests on emulators where possible.
3. Use a real project + optional key only when you must reproduce GCP-only behavior.
4. Production: deploy to Firebase Functions and rely on ADC plus [firebase-gcp-storage.md](./firebase-gcp-storage.md) for Storage signing and CORS.
