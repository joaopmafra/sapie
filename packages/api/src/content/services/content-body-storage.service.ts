import { Injectable, Logger } from '@nestjs/common';

import { FirebaseAdminService } from '../../firebase';

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

  private resolvedBucketName(): string {
    const explicit = process.env.FIREBASE_STORAGE_BUCKET?.trim();
    const projectId = process.env.GCLOUD_PROJECT?.trim();
    const bucketName = explicit || (projectId ? `${projectId}.appspot.com` : '');
    if (!bucketName) {
      throw new Error(
        'Set FIREBASE_STORAGE_BUCKET or GCLOUD_PROJECT so the Storage bucket name can be resolved.'
      );
    }
    return bucketName;
  }

  private defaultBucket() {
    return this.firebaseAdminService.getStorage().bucket(this.resolvedBucketName());
  }

  /**
   * Uploads raw bytes for a content body and returns the object path and byte length (for Firestore `bodyUri` / `size`).
   * `mimeType` is stored as the object `contentType` in Cloud Storage.
   */
  async uploadBody(
    ownerId: string,
    contentId: string,
    body: Buffer,
    mimeType: string
  ): Promise<{ bodyUri: string; size: number }> {
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
    return { bodyUri: path, size: body.length };
  }
}
