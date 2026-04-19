# Firebase / GCS: signed read URLs and bucket CORS

The `GET /api/content/:id/body/signed-url` handler uses `@google-cloud/storage` (`getSignedUrl()`). Responses use
**`Cache-Control: no-store`** (including **404** problem details) so browsers do not reuse a stale “no body” response
after the first successful `PUT …/body`.

For where bytes are stored and bucket env vars, see [Cloud Storage (content bodies)](../README.md#cloud-storage-content-bodies) in the API README.

---

## Signed read URLs and IAM (`signBlob`)

On **Cloud Run / Firebase Functions Gen 2**, the runtime has **no local private key**. The client library signs V4 URLs
via Google’s **IAM Credentials API** (`signBlob`). If that call is denied, logs or errors may include:

`Permission 'iam.serviceAccounts.signBlob' denied`

### 1. Enable the IAM Service Account Credentials API

In Google Cloud Console: **APIs & Services → Library** → enable **IAM Service Account Credentials API**.

### 2. Grant Service Account Token Creator (typical: self-grant)

The identity that **runs** your API must be allowed to **impersonate** the service account used for signing (often the
**same** account). Grant **`roles/iam.serviceAccountTokenCreator`** on that service account, with **principal** = that
same account email (a “self-grant”).

**Find the runtime service account**

In **IAM & Admin → Service accounts**, identify the account attached to your Cloud Run service or Firebase function (for
example the default Compute Engine service account:

`{PROJECT_NUMBER}-compute@developer.gserviceaccount.com`).

**`gcloud` (recommended, repeatable)**

Replace `SA_EMAIL` with that email (both places):

```bash
gcloud iam service-accounts add-iam-policy-binding "SA_EMAIL" \
  --member="serviceAccount:SA_EMAIL" \
  --role="roles/iam.serviceAccountTokenCreator"
```

Example shape (numbers are illustrative only):

```bash
gcloud iam service-accounts add-iam-policy-binding \
  "935378953099-compute@developer.gserviceaccount.com" \
  --member="serviceAccount:935378953099-compute@developer.gserviceaccount.com" \
  --role="roles/iam.serviceAccountTokenCreator"
```

**Console**

Open the service account → **Permissions** → **Grant access** → **New principals**: paste the **same** service account
email → **Role**: *Service Account Token Creator* → save.

If your function runs as account **A** but signing uses account **B** (uncommon), grant **A** the Token Creator role
**on** **B** (`--member="serviceAccount:A"` binding on resource `B`).

After changes, redeploy or wait briefly for IAM propagation if errors persist.

### Firebase Storage security rules

Rules such as `allow read, write: if false` apply to **client SDK** access. **V4 signed URLs** issued by the Admin SDK
are authorized by GCS using the signature; they are **not** gated by those rules, so deny-all rules alone do not block
signed URLs once IAM signing works.

---

## Alternative: sign with a service account JSON key

If you **do not** grant the Token Creator / `signBlob` path, you can initialize the Firebase Admin SDK (or underlying
Google auth) with a **service account JSON key file**. The library then uses the **private key in the file** to sign URLs
locally and avoids the IAM `signBlob` call.

Trade-offs: key files must be stored and rotated carefully; default **workload identity** on Cloud Functions / Cloud Run
(with the IAM binding above) is usually the safer default.

Local / optional env var used by this repo: `FIREBASE_SERVICE_ACCOUNT_KEY_PATH` — see
[firebase-admin-setup.md](./firebase-admin-setup.md).

---

## Browser CORS (fetch from web app)

The SPA loads note bytes with `fetch(signedUrl)` toward `https://storage.googleapis.com/…`. That is **cross-origin** from
your Hosting origin, so the **default Firebase / GCS bucket** must expose a **CORS configuration** that lists your app
origins. If CORS is missing, the browser reports that **no `Access-Control-Allow-Origin` header** is present.

This is **only** about the **Storage bucket**. **API CORS** on Cloud Functions (Nest HTTP) is separate.

The SPA does not call `GET …/body/signed-url` until metadata shows a stored body (**`size`** set); it also sends
**`Cache-Control: no-cache`** on that request as a safeguard.

### 1. Prepare a CORS JSON file

Copy [`../config/storage-cors.example.json`](../config/storage-cors.example.json) to e.g. `config/storage-cors.json` (do
not commit project-specific files if your policy forbids it). Replace `YOUR_PROJECT_ID` in origins with your Firebase /
GCP project id. Add staging or custom domains as needed.

### 2. Apply to the default Storage bucket

Bucket name must match **Firebase / `FIREBASE_CONFIG` → `storageBucket`** (legacy `PROJECT_ID.appspot.com` or newer
`PROJECT_ID.firebasestorage.app`).

From the **`packages/api`** directory (adjust paths if you run from elsewhere):

```bash
gcloud storage buckets update "gs://PROJECT_ID.firebasestorage.app" \
  --cors-file=config/storage-cors.json
```

Example:

```bash
gcloud storage buckets update "gs://sapie-b09be.firebasestorage.app" \
  --cors-file=./storage-cors.json
```

(`./storage-cors.json` is fine if that file sits in your current working directory.)

**`gsutil` alternative:**

```bash
gsutil cors set config/storage-cors.json "gs://PROJECT_ID.firebasestorage.app"
```

Changes usually apply quickly; hard-refresh the app and retry.

---

## Emulators and tests

When `FIREBASE_STORAGE_EMULATOR_HOST` is set (default emulator port **9199**), signing and CORS behave differently from
production. For **`pnpm test`** / `CURRENT_ENV=test-unit`, see the API README section **Cloud Storage (content bodies)**
and `compose.test-unit.yml`.
