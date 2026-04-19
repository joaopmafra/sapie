# Firebase (web client)

## Note bodies and signed URLs (CORS)

For notes with a stored body, the app calls the API for a **signed GCS URL**, then **`fetch(signedUrl)`** loads the bytes
from `https://storage.googleapis.com/…`. That request is **cross-origin** from your Hosting app.

If the browser reports **no `Access-Control-Allow-Origin` header** on the Storage response, the fix is **not** in Vite
or Nest API CORS alone: the **default Firebase Storage bucket** needs a **GCS CORS configuration**. Step-by-step
commands (including `gcloud storage buckets update` and IAM for signing) live in the API package:

**[packages/api/docs/firebase-gcp-storage.md](../../api/docs/firebase-gcp-storage.md)**

---

## Quick start (real Firebase project)

The app can run with placeholder config in some dev modes; for full Auth against a real project:

### 1. Create a Firebase project

1. [Firebase Console](https://console.firebase.google.com/) → **Add project**
2. Analytics optional for dev

### 2. Enable Authentication

**Authentication** → **Sign-in method**:

- **Email/Password**: enable
- **Google**: enable; set support email; for dev add **Authorized domains** (e.g. `localhost`)

### 3. Register a web app

**Project settings** → **Your apps** → Add **Web** app → copy the Firebase config object.

### 4. Environment variables

Create **`packages/web/.env.local`**:

```bash
# Firebase (Vite)
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# API (adjust for emulator vs local Vite)
VITE_API_BASE_URL=http://localhost:5001
```

Use the **storage bucket** string from the Firebase console (`*.appspot.com` or `*.firebasestorage.app`).

### 5. Google Sign-In (OAuth client)

If you use Google Sign-In:

1. [Google Cloud Console](https://console.cloud.google.com/) → your Firebase-linked project
2. **APIs & Services → Credentials**
3. Configure **OAuth consent screen** (External for testing; add test users as needed)
4. **Create credentials → OAuth client ID → Web application**
   - **Authorized JavaScript origins**: `http://localhost:5173` (dev)
   - **Authorized redirect URIs**: `http://localhost:5173/__/auth/handler`

---

## Emulators (repo defaults)

Do **not** rely on generic `firebase init` for the main flows; use the root **Docker Compose** emulator scripts (see
repository [README.md](../../../README.md)).

- **Hybrid local** (`compose.local-dev.yml`): Auth emulator — see **`packages/web/.env.local-dev.example`** (Auth
  **9100**, etc.).
- **Full stack / E2E**: Auth **9099**, Hosting **5000**, Functions **5001** — see root README and **`packages/test-e2e/README.md`**.

---

## Environment variables reference

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_FIREBASE_API_KEY` | Web API key | (from console) |
| `VITE_FIREBASE_AUTH_DOMAIN` | Auth domain | `myproject.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Project id | `myproject` |
| `VITE_FIREBASE_STORAGE_BUCKET` | GCS bucket | `myproject.appspot.com` or `myproject.firebasestorage.app` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Sender id | (from console) |
| `VITE_FIREBASE_APP_ID` | App id | (from console) |

---

## Troubleshooting

### `auth/invalid-api-key`

- Check `VITE_FIREBASE_API_KEY` and that `.env.local` is under **`packages/web/`**
- Restart the Vite dev server after env changes

### Sign-in or provider errors

- Confirm providers are enabled in Firebase Console
- Confirm **Authorized domains** include your dev host
- For Google: OAuth client origins/redirect URIs must match

### Emulator connection

- Start the stack your `.env` expects (hybrid vs full emulator)
- Confirm Auth emulator host/port match `VITE_FIREBASE_AUTH_EMULATOR_HOST` when used
