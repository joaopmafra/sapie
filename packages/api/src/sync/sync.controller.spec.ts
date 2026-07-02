import { SyncControllerFixture } from './sync.controller.fixture';

interface LockResponse {
  ownerId: string;
  lockedAt: string;
  expiresAt: string;
  instanceId: string;
  locked: boolean;
  operation: string;
}

interface LockCheckResponse {
  locked: boolean;
  lock: LockResponse | null;
}

describe('SyncController', () => {
  const fixture = new SyncControllerFixture();

  beforeAll(async () => {
    await fixture.init();
  });

  beforeEach(async () => {
    await fixture.clearDatabase();
  });

  afterAll(async () => {
    await fixture.close();
  });

  describe('POST /api/sync/lock', () => {
    it('acquires a lock for the authenticated user', async () => {
      const response = await fixture.acquireLockExpectingCreated(
        fixture.TEST_USER_ID,
        'instance-1'
      );
      const body = response.body as LockResponse;

      expect(body).toMatchObject({
        ownerId: fixture.TEST_USER_ID,
        instanceId: 'instance-1',
        locked: true,
        operation: 'sync-push',
      });
      expect(body).toHaveProperty('lockedAt');
      expect(body).toHaveProperty('expiresAt');
      const expiresAt = new Date(body.expiresAt);
      const now = new Date();
      const diffMinutes = (expiresAt.getTime() - now.getTime()) / 60_000;
      expect(diffMinutes).toBeGreaterThan(4.5);
      expect(diffMinutes).toBeLessThan(5.5);
    });

    it('returns 409 when lock is already held and not expired', async () => {
      await fixture.acquireLockExpectingCreated(fixture.TEST_USER_ID, 'instance-1');

      const conflictResponse = await fixture.acquireLockExpectingConflict(
        fixture.TEST_USER_ID,
        'instance-2'
      );
      const body = conflictResponse.body as Record<string, unknown>;

      expect(body).toMatchObject({
        title: 'Sync Lock Conflict',
        status: 409,
        instanceId: 'instance-1',
      });
    });

    it('overwrites expired lock', async () => {
      await fixture.acquireLockExpectingCreated(fixture.TEST_USER_ID, 'instance-1');
      await fixture.expireLock(fixture.TEST_USER_ID);

      const response = await fixture.acquireLockExpectingCreated(
        fixture.TEST_USER_ID,
        'instance-2'
      );
      const body = response.body as LockResponse;
      expect(body.instanceId).toBe('instance-2');
    });

    it('different users have independent locks', async () => {
      await fixture.acquireLockExpectingCreated(fixture.TEST_USER_ID, 'instance-a');
      const response = await fixture.acquireLockExpectingCreated('another-user', 'instance-b');
      const body = response.body as LockResponse;
      expect(body.ownerId).toBe('another-user');
      expect(body.instanceId).toBe('instance-b');
    });
  });

  describe('GET /api/sync/lock', () => {
    it('returns locked=false when no lock exists', async () => {
      const response = await fixture.checkLockExpectingOk(fixture.TEST_USER_ID);
      const body = response.body as LockCheckResponse;
      expect(body).toEqual({ locked: false, lock: null });
    });

    it('returns locked=true with lock info when lock exists', async () => {
      await fixture.acquireLockExpectingCreated(fixture.TEST_USER_ID, 'instance-1');

      const response = await fixture.checkLockExpectingOk(fixture.TEST_USER_ID);
      const body = response.body as LockCheckResponse;
      expect(body.locked).toBe(true);
      expect(body.lock).toMatchObject({
        ownerId: fixture.TEST_USER_ID,
        instanceId: 'instance-1',
        operation: 'sync-push',
      });
    });
  });

  describe('DELETE /api/sync/lock', () => {
    it('releases a lock held by the same instance', async () => {
      await fixture.acquireLockExpectingCreated(fixture.TEST_USER_ID, 'instance-1');
      await fixture.releaseLockExpectingNoContent(fixture.TEST_USER_ID, 'instance-1');

      const check = await fixture.checkLockExpectingOk(fixture.TEST_USER_ID);
      const body = check.body as LockCheckResponse;
      expect(body.locked).toBe(false);
    });

    it('returns 204 even when no lock exists (idempotent)', async () => {
      await fixture.releaseLockExpectingNoContent(fixture.TEST_USER_ID, 'nonexistent');
    });

    it('returns 403 when a different instance tries to release', async () => {
      await fixture.acquireLockExpectingCreated(fixture.TEST_USER_ID, 'instance-1');

      const response = await fixture.callReleaseLock(fixture.TEST_USER_ID, 'instance-2');
      expect(response.status).toBe(403);
      const body = response.body as Record<string, unknown>;
      expect(body).toMatchObject({
        title: 'Sync Lock Mismatch',
        status: 403,
        instanceId: 'instance-1',
      });
    });
  });
});
