import { HttpStatus } from '@nestjs/common';
import * as admin from 'firebase-admin';
import * as supertest from 'supertest';

import { AppFixture } from '../test-helpers/app.fixture';
import { TEST_USER_ID_HEADER } from '../test-helpers/fake-auth.guard';
import { FirebaseAdminService } from '../firebase';

export class SyncControllerFixture extends AppFixture {
  readonly API_SYNC_LOCK = '/api/sync/lock';
  readonly TEST_USER_ID = 'sync-test-user';

  async init(): Promise<void> {
    this.createTestingModuleBuilder().withFakeAuth();
    await this.buildAndInit();
  }

  // POST /api/sync/lock
  callAcquireLock(userId: string, instanceId: string): supertest.Test {
    return supertest(this.getHttpServer())
      .post(this.API_SYNC_LOCK)
      .set(TEST_USER_ID_HEADER, userId)
      .send({ instanceId });
  }

  async acquireLockExpectingCreated(
    userId: string,
    instanceId: string
  ): Promise<supertest.Response> {
    return this.callAcquireLock(userId, instanceId).expect(HttpStatus.CREATED);
  }

  async acquireLockExpectingConflict(
    userId: string,
    instanceId: string
  ): Promise<supertest.Response> {
    return this.callAcquireLock(userId, instanceId).expect(HttpStatus.CONFLICT);
  }

  // DELETE /api/sync/lock?instanceId=...
  callReleaseLock(userId: string, instanceId: string): supertest.Test {
    return supertest(this.getHttpServer())
      .delete(this.API_SYNC_LOCK)
      .query({ instanceId })
      .set(TEST_USER_ID_HEADER, userId);
  }

  async releaseLockExpectingNoContent(
    userId: string,
    instanceId: string
  ): Promise<supertest.Response> {
    return this.callReleaseLock(userId, instanceId).expect(HttpStatus.NO_CONTENT);
  }

  // GET /api/sync/lock
  callCheckLock(userId: string): supertest.Test {
    return supertest(this.getHttpServer()).get(this.API_SYNC_LOCK).set(TEST_USER_ID_HEADER, userId);
  }

  async checkLockExpectingOk(userId: string): Promise<supertest.Response> {
    return this.callCheckLock(userId).expect(HttpStatus.OK);
  }

  /** Helper: manually expire a lock in Firestore to test overwrite. */
  async expireLock(ownerId: string): Promise<void> {
    const firebaseAdminService = this.getComponent(FirebaseAdminService);
    const firestore = firebaseAdminService.getFirestore();
    await firestore
      .collection('locks')
      .doc(ownerId)
      .update({
        expiresAt: admin.firestore.Timestamp.fromMillis(Date.now() - 60_000),
      });
  }
}
