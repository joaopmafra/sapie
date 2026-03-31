function getFirestoreClearUrl(): string {
  const firestoreHost = process.env.FIRESTORE_EMULATOR_HOST;
  if (!firestoreHost) {
    throw new Error('FIRESTORE_EMULATOR_HOST is required to clear Firestore data');
  }

  const projectId = process.env.GCLOUD_PROJECT;
  if (!projectId) {
    throw new Error('GCLOUD_PROJECT is required to clear Firestore data');
  }

  return `http://${firestoreHost}/emulator/v1/projects/${projectId}/databases/(default)/documents`;
}

export async function clearFirestoreData(): Promise<void> {
  const url = getFirestoreClearUrl();
  const method = 'DELETE';
  const response = await fetch(url, { method });

  if (!response.ok) {
    throw new Error(
      `Failed to clear Firestore data. Http call: ${method} ${url}; Status: ${response.status}`
    );
  }
}
