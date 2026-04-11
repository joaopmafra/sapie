import { Injectable, Logger } from '@nestjs/common';

import { FirebaseAdminService } from '../../firebase';

const SIGNED_URL_TTL_MS = 10 * 60 * 1000;
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
   * The Storage emulator does not support Admin `getSignedUrl` without production-style signing credentials.
   * Return the same JSON shape using an emulator HTTP download URL (rules still apply).
   */
  private emulatorMediaDownloadUrl(objectPath: string): string {
    const raw = process.env.FIREBASE_STORAGE_EMULATOR_HOST?.trim();
    if (!raw) {
      throw new Error('FIREBASE_STORAGE_EMULATOR_HOST must be set for emulator download URLs');
    }
    const origin =
      raw.startsWith('http://') || raw.startsWith('https://')
        ? raw.replace(/^https:\/\//, 'http://')
        : `http://${raw}`;
    const bucketName = this.resolvedBucketName();
    const encodedObject = encodeURIComponent(objectPath);
    return `${origin}/v0/b/${encodeURIComponent(bucketName)}/o/${encodedObject}?alt=media`;
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

  /**
   * Creates a read signed URL which expires after a predefined amount of time.
   *
   * @param objectPath Firestore `bodyUri` — object path in the default bucket.
   * @see {SIGNED_URL_TTL_MS}
   */
  async getSignedReadUrl(objectPath: string): Promise<{ signedUrl: string; expiresAt: Date }> {
    const expiresAt = new Date(Date.now() + SIGNED_URL_TTL_MS);
    if (process.env.FIREBASE_STORAGE_EMULATOR_HOST?.trim()) {
      return { signedUrl: this.emulatorMediaDownloadUrl(objectPath), expiresAt };
    }
    const [signedUrl] = await this.defaultBucket().file(objectPath).getSignedUrl({
      action: 'read',
      expires: expiresAt,
    });
    return { signedUrl, expiresAt };
  }
}
