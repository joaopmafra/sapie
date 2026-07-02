import { Injectable, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { FirebaseAdminService } from '../firebase';

export interface LockInfo {
  ownerId: string;
  lockedAt: string; // ISO 8601
  expiresAt: string; // ISO 8601
  resourceIds: string[];
  operation: string;
  instanceId: string;
  locked: boolean;
}

export interface LockStatus {
  locked: boolean;
  lock: LockInfo | null;
}

export interface AcquireLockResult {
  acquired: boolean;
  lock?: LockInfo;
  existingLock?: LockInfo;
}

const LOCK_COLLECTION = 'locks';
const LOCK_TTL_MINUTES = 5;

function toLockInfo(ownerId: string, doc: admin.firestore.DocumentData, locked: boolean): LockInfo {
  const lockedAt = doc.lockedAt as admin.firestore.Timestamp;
  const expiresAt = doc.expiresAt as admin.firestore.Timestamp;
  return {
    ownerId,
    lockedAt: lockedAt.toDate().toISOString(),
    expiresAt: expiresAt.toDate().toISOString(),
    resourceIds: (doc.resourceIds as string[]) ?? [],
    operation: (doc.operation as string) ?? 'sync-push',
    instanceId: (doc.instanceId as string) ?? '',
    locked,
  };
}

@Injectable()
export class SyncLockService {
  private readonly logger = new Logger(SyncLockService.name);

  constructor(private readonly firebaseAdminService: FirebaseAdminService) {}

  private get firestore(): admin.firestore.Firestore {
    return this.firebaseAdminService.getFirestore();
  }

  /**
   * Try to acquire a sync lock. Returns either a lock or conflict info.
   * Caller (the controller) decides the HTTP status code.
   */
  async acquireLock(ownerId: string, instanceId: string): Promise<AcquireLockResult> {
    const lockRef = this.firestore.collection(LOCK_COLLECTION).doc(ownerId);

    const result = await this.firestore.runTransaction(async tx => {
      const doc = await tx.get(lockRef);

      if (doc.exists) {
        const data = doc.data()!;
        const expiresAt = data.expiresAt as admin.firestore.Timestamp;
        const now = admin.firestore.Timestamp.now();

        if (expiresAt.toMillis() > now.toMillis()) {
          return { conflict: true, lockInfo: toLockInfo(ownerId, data, true) };
        }
      }

      const now = admin.firestore.Timestamp.now();
      const expiresAt = new admin.firestore.Timestamp(
        now.seconds + LOCK_TTL_MINUTES * 60,
        now.nanoseconds
      );

      const lockData = {
        ownerId,
        lockedAt: now,
        expiresAt,
        resourceIds: [],
        operation: 'sync-push',
        instanceId,
      };

      tx.set(lockRef, lockData);
      return { conflict: false, lockInfo: toLockInfo(ownerId, lockData, true) };
    });

    if (result.conflict) {
      this.logger.warn(
        `Lock already held by instance ${result.lockInfo.instanceId} (expires ${result.lockInfo.expiresAt})`
      );
      return { acquired: false, existingLock: result.lockInfo };
    }

    this.logger.log(`Lock acquired for owner ${ownerId} (instance ${instanceId})`);
    return { acquired: true, lock: result.lockInfo };
  }

  /**
   * Release a sync lock. Returns true if released, false if no lock existed.
   * Throws if a different instance holds the lock.
   */
  async releaseLock(
    ownerId: string,
    instanceId: string
  ): Promise<{ released: boolean; mismatchedInstance?: string }> {
    const lockRef = this.firestore.collection(LOCK_COLLECTION).doc(ownerId);

    const result = await this.firestore.runTransaction(async tx => {
      const doc = await tx.get(lockRef);

      if (!doc.exists) {
        return { released: false };
      }

      const data = doc.data()!;
      const existingInstanceId = data.instanceId as string;

      if (existingInstanceId !== instanceId) {
        return { released: false, mismatchedInstance: existingInstanceId };
      }

      tx.delete(lockRef);
      return { released: true };
    });

    if (result.mismatchedInstance) {
      this.logger.warn(
        `Lock release denied: instance ${instanceId} tried to release lock held by ${result.mismatchedInstance}`
      );
    } else if (result.released) {
      this.logger.log(`Lock released for owner ${ownerId} (instance ${instanceId})`);
    }

    return result;
  }

  /**
   * Check current lock status.
   */
  async checkLock(ownerId: string): Promise<LockStatus> {
    const lockRef = this.firestore.collection(LOCK_COLLECTION).doc(ownerId);

    const doc = await lockRef.get();

    if (!doc.exists) {
      return { locked: false, lock: null };
    }

    const data = doc.data()!;
    const expiresAt = data.expiresAt as admin.firestore.Timestamp;
    const now = admin.firestore.Timestamp.now();

    if (expiresAt.toMillis() <= now.toMillis()) {
      return { locked: false, lock: null };
    }

    return { locked: true, lock: toLockInfo(ownerId, data, true) };
  }

  /**
   * Force-release a lock regardless of instance. For admin/abort use.
   */
  async forceReleaseLock(ownerId: string): Promise<void> {
    const lockRef = this.firestore.collection(LOCK_COLLECTION).doc(ownerId);
    await lockRef.delete();
    this.logger.log(`Lock force-released for owner ${ownerId}`);
  }
}
