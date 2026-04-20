import { Injectable, Logger } from '@nestjs/common';

import { FirebaseAdminService } from '../../firebase';
import { resolveFirebaseStorageBucketName } from '../../firebase/resolve-storage-bucket-name';

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
}
