/**
 * Resolves the GCS bucket name used for Firebase Storage (uploads, signed URLs, emulator reads).
 *
 * Resolution order:
 * 1. `FIREBASE_STORAGE_BUCKET` — explicit override (any host, e.g. `my-project.firebasestorage.app`).
 * 2. `FIREBASE_CONFIG` JSON — set on Firebase Cloud Functions / emulator; includes the project’s real
 *    default bucket (legacy `*.appspot.com` or newer `*.firebasestorage.app` since ~Oct 2024).
 * 3. `{GCLOUD_PROJECT}.appspot.com` — legacy default when running without `FIREBASE_CONFIG` (e.g. some local tests).
 *
 * @see https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024
 */
export function resolveFirebaseStorageBucketName(): string {
  const explicit = process.env.FIREBASE_STORAGE_BUCKET?.trim();
  if (explicit) {
    return stripGsPrefix(explicit);
  }

  const fromFirebaseConfig = storageBucketFromFirebaseConfig();
  if (fromFirebaseConfig) {
    return stripGsPrefix(fromFirebaseConfig);
  }

  const projectId = process.env.GCLOUD_PROJECT?.trim();
  if (projectId) {
    return `${projectId}.appspot.com`;
  }

  throw new Error(
    'Set FIREBASE_STORAGE_BUCKET, run with FIREBASE_CONFIG (Firebase / emulator), or set GCLOUD_PROJECT so the Storage bucket name can be resolved.'
  );
}

function stripGsPrefix(name: string): string {
  return name.replace(/^gs:\/\//i, '');
}

function storageBucketFromFirebaseConfig(): string | undefined {
  const raw = process.env.FIREBASE_CONFIG?.trim();
  if (!raw) {
    return undefined;
  }
  try {
    const parsed = JSON.parse(raw) as { storageBucket?: string };
    const b = parsed.storageBucket?.trim();
    return b || undefined;
  } catch {
    return undefined;
  }
}
