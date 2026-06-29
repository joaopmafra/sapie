import { Injectable, Logger } from '@nestjs/common';

import { FirebaseAdminService } from '../../firebase';
import { resolveFirebaseStorageBucketName } from '../../firebase/resolve-storage-bucket-name';

import type { Readable } from 'stream';

const CLIENT_CACHE_TTL_S = 60 * 60;

@Injectable()
export class ContentBodyStorageService {
  private readonly logger = new Logger(ContentBodyStorageService.name);

  constructor(private readonly firebaseAdminService: FirebaseAdminService) {}

  /**
   * Object path inside the bucket: `{ownerId}/content/{contentId}` (no leading slash).
   */
  objectPath(ownerId: string, contentId: string): string {
    return `${ownerId}/content/${contentId}`;
  }

  /**
   * Object path for a blob: `{ownerId}/content/{contentId}/blobs/{blobId}`.
   */
  blobObjectPath(ownerId: string, contentId: string, blobId: string): string {
    return `${ownerId}/content/${contentId}/blobs/${blobId}`;
  }

  /**
   * Prefix for listing/deleting all blobs under a content item:
   * `{ownerId}/content/{contentId}/blobs/`.
   */
  blobPrefix(ownerId: string, contentId: string): string {
    return `${ownerId}/content/${contentId}/blobs/`;
  }

  private defaultBucket() {
    return this.firebaseAdminService.getStorage().bucket(resolveFirebaseStorageBucketName());
  }

  /**
   * Uploads raw bytes for a content body and returns the bucket object path and byte length (persisted as `body.uri` / `body.size`).
   * `mimeType` is stored as the object `contentType` in Cloud Storage.
   */
  async uploadBody(
    ownerId: string,
    contentId: string,
    body: Buffer,
    mimeType: string
  ): Promise<{ objectPath: string; size: number }> {
    const bucket = this.defaultBucket();
    const path = this.objectPath(ownerId, contentId);
    const file = bucket.file(path);

    await file.save(body, {
      metadata: {
        contentType: mimeType,
        cacheControl: `private, max-age=${CLIENT_CACHE_TTL_S}`,
      },
    });

    this.logger.debug(`Uploaded content body for ${contentId} (${body.length} bytes, ${mimeType})`);
    return { objectPath: path, size: body.length };
  }

  /**
   * Opens a read stream for an existing object. Returns `null` when the object is missing.
   */
  async openBodyReadStream(
    objectPath: string
  ): Promise<{ stream: Readable; contentType: string } | null> {
    const bucket = this.defaultBucket();
    const file = bucket.file(objectPath);
    const [exists] = await file.exists();
    if (!exists) {
      return null;
    }

    const [metadata] = await file.getMetadata();
    const contentType = metadata.contentType ?? 'application/octet-stream';
    const stream = file.createReadStream();
    stream.on('error', err => {
      this.logger.warn(`Stream error for ${objectPath}: ${String(err)}`);
    });

    return { stream, contentType };
  }

  /**
   * Uploads raw bytes for a blob. Sets immutable cache headers.
   */
  async uploadBlob(
    ownerId: string,
    contentId: string,
    blobId: string,
    body: Buffer,
    mimeType: string
  ): Promise<{ objectPath: string; size: number }> {
    const bucket = this.defaultBucket();
    const path = this.blobObjectPath(ownerId, contentId, blobId);
    const file = bucket.file(path);

    await file.save(body, {
      metadata: {
        contentType: mimeType,
        cacheControl: 'private, max-age=31536000, immutable',
      },
    });

    this.logger.debug(
      `Uploaded blob ${blobId} for content ${contentId} (${body.length} bytes, ${mimeType})`
    );
    return { objectPath: path, size: body.length };
  }

  /**
   * Opens a read stream for a blob object. Returns `null` when the object is missing.
   */
  async openBlobReadStream(
    objectPath: string
  ): Promise<{ stream: Readable; contentType: string } | null> {
    return this.openBodyReadStream(objectPath);
  }

  /**
   * Deletes a storage object when present. Idempotent when the object is already gone.
   */
  async deleteObject(objectPath: string): Promise<void> {
    const bucket = this.defaultBucket();
    const file = bucket.file(objectPath);
    const [exists] = await file.exists();
    if (exists) {
      await file.delete();
      this.logger.debug(`Deleted storage object ${objectPath}`);
    }
  }

  /**
   * Lists and deletes all blobs under the given content prefix.
   */
  async deleteBlobsByPrefix(ownerId: string, contentId: string): Promise<void> {
    const bucket = this.defaultBucket();
    const prefix = this.blobPrefix(ownerId, contentId);
    const [files] = await bucket.getFiles({ prefix });
    if (files.length === 0) {
      return;
    }
    await Promise.all(files.map(file => file.delete()));
    this.logger.debug(`Deleted ${files.length} blob(s) under prefix ${prefix}`);
  }
}
