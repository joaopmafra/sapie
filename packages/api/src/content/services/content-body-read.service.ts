import { Injectable, Logger, Provider } from '@nestjs/common';
import { FirebaseAdminService } from '../../firebase';
import { resolveFirebaseStorageBucketName } from '../../firebase/resolve-storage-bucket-name';
import { FAKE_STORAGE_READ_CONTROLLER_BASE_PATH } from '../../fake-storage/fake-storage-read.controller';
import { FakeStorageModule } from '../../fake-storage/fake-storage.module';

/** TTL for issued read URLs (matches historical `ContentBodyStorageService` behavior). */
export const CONTENT_BODY_SIGNED_READ_URL_TTL_MS = 10 * 60 * 1000;

export const CONTENT_BODY_READ_SERVICE = Symbol('CONTENT_BODY_READ_SERVICE');

export interface ContentBodyReadService {
  getSignedReadUrl(objectPath: string): Promise<{ signedUrl: string; expiresAt: Date }>;
}

export function getContentBodyReadServiceProviderPair(): Provider[] {
  return FakeStorageModule.isEnabled()
    ? [
        FakeContentBodyReadService,
        {
          provide: CONTENT_BODY_READ_SERVICE,
          useExisting: FakeContentBodyReadService,
        },
      ]
    : [
        FirebaseContentBodyReadService,
        {
          provide: CONTENT_BODY_READ_SERVICE,
          useExisting: FirebaseContentBodyReadService,
        },
      ];
}

/**
 * Real signed read URL issuer.
 */
@Injectable()
export class FirebaseContentBodyReadService implements ContentBodyReadService {
  private readonly logger = new Logger(FirebaseContentBodyReadService.name);

  constructor(private readonly firebaseAdminService: FirebaseAdminService) {}

  private defaultBucket() {
    return this.firebaseAdminService.getStorage().bucket(resolveFirebaseStorageBucketName());
  }

  async getSignedReadUrl(objectPath: string): Promise<{ signedUrl: string; expiresAt: Date }> {
    const expiresAt = new Date(Date.now() + CONTENT_BODY_SIGNED_READ_URL_TTL_MS);
    const [signedUrl] = await this.defaultBucket().file(objectPath).getSignedUrl({
      action: 'read',
      expires: expiresAt,
    });
    this.logger.debug(
      `Issued production-style signed read URL for object path (expires ${expiresAt.toISOString()})`
    );
    return { signedUrl, expiresAt };
  }
}

/**
 * Fake signed read URL issuer: URLs hit `FakeStorageReadController`, which streams bytes from the
 * Storage emulator via Admin SDK (no HMAC / no GCS V4 wire compatibility).
 */
@Injectable()
export class FakeContentBodyReadService implements ContentBodyReadService {
  private readonly logger = new Logger(FakeContentBodyReadService.name);

  getSignedReadUrl(objectPath: string): Promise<{ signedUrl: string; expiresAt: Date }> {
    const baseUrl = process.env.API_EXTERNAL_BASE_URL ?? '';
    const expiresAt = new Date(Date.now() + CONTENT_BODY_SIGNED_READ_URL_TTL_MS);
    const xGoogExpires = Math.floor(expiresAt.getTime() / 1000);
    const payload = { p: objectPath };
    // we don't need real encryption in this fake, so we encode to base64
    const xGoogSignature = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
    const qs = new URLSearchParams({
      'X-Goog-Expires': String(xGoogExpires),
      'X-Goog-Signature': xGoogSignature,
    });
    const signedUrl = `${baseUrl}${FAKE_STORAGE_READ_CONTROLLER_BASE_PATH}/read?${qs.toString()}`;
    return Promise.resolve({ signedUrl, expiresAt });
  }
}
