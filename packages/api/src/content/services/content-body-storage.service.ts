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
}
