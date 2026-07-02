import { Module } from '@nestjs/common';
import { SyncController } from './sync.controller';
import { SyncLockService } from './sync-lock.service';

/**
 * Sync Module
 *
 * Provides pessimistic locking for CLI push operations via `/api/sync/lock` endpoints.
 * The lock is a single-user lock (owner-scoped), not per-resource.
 * Automatic expiry after 5 minutes prevents stale locks from crashes.
 */
@Module({
  controllers: [SyncController],
  providers: [SyncLockService],
  exports: [SyncLockService],
})
export class SyncModule {}
