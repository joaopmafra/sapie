import { resolveFirebaseStorageBucketName } from './resolve-storage-bucket-name';

describe('resolveFirebaseStorageBucketName', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.FIREBASE_STORAGE_BUCKET;
    delete process.env.FIREBASE_CONFIG;
    delete process.env.GCLOUD_PROJECT;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('prefers FIREBASE_STORAGE_BUCKET', () => {
    process.env.FIREBASE_STORAGE_BUCKET = 'gs://my-explicit-bucket';
    process.env.FIREBASE_CONFIG = JSON.stringify({
      storageBucket: 'wrong-from-config.appspot.com',
    });
    process.env.GCLOUD_PROJECT = 'myproj';

    expect(resolveFirebaseStorageBucketName()).toBe('my-explicit-bucket');
  });

  it('uses storageBucket from FIREBASE_CONFIG when set', () => {
    process.env.FIREBASE_CONFIG = JSON.stringify({
      projectId: 'sapie-b09be',
      storageBucket: 'sapie-b09be.firebasestorage.app',
    });
    process.env.GCLOUD_PROJECT = 'sapie-b09be';

    expect(resolveFirebaseStorageBucketName()).toBe('sapie-b09be.firebasestorage.app');
  });

  it('falls back to GCLOUD_PROJECT.appspot.com when FIREBASE_CONFIG is absent', () => {
    process.env.GCLOUD_PROJECT = 'demo-test-unit';

    expect(resolveFirebaseStorageBucketName()).toBe('demo-test-unit.appspot.com');
  });

  it('throws when nothing can resolve a bucket', () => {
    expect(() => resolveFirebaseStorageBucketName()).toThrow(/FIREBASE_STORAGE_BUCKET/);
  });
});
