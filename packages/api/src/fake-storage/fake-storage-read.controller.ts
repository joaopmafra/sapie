import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Get,
  Logger,
  NotFoundException,
  Query,
  StreamableFile,
} from '@nestjs/common';

import { FirebaseAdminService } from '../firebase';

export const FAKE_STORAGE_READ_CONTROLLER_BASE_PATH = '/api/fake-storage';

/** Accepts Firebase-style object paths used as `bodyUri` (no `..`, no leading slash). */
const OBJECT_PATH_PATTERN = /^[^/]+\/content\/[^/]+$/;

/**
 * Minimal HTTP surface for fake storage "signed" reads: validates expiry and path shape, then
 * streams the object from the configured bucket (emulator or real).
 */
@Controller(FAKE_STORAGE_READ_CONTROLLER_BASE_PATH)
export class FakeStorageReadController {
  private readonly logger = new Logger(FakeStorageReadController.name);

  constructor(private readonly firebaseAdminService: FirebaseAdminService) {}

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

  @Get('read')
  async read(
    @Query('X-Goog-Expires') xGoogExpires: string | undefined,
    @Query('X-Goog-Signature') xGoogSignature: string | undefined
  ): Promise<StreamableFile> {
    if (xGoogExpires === undefined || xGoogSignature === undefined) {
      throw new BadRequestException('Missing X-Goog-Expires or X-Goog-Signature');
    }
    const expSec = Number(xGoogExpires);
    if (!Number.isFinite(expSec) || expSec <= 0) {
      throw new BadRequestException('Invalid X-Goog-Expires');
    }
    if (expSec * 1000 < Date.now()) {
      throw new ForbiddenException('Read URL has expired');
    }

    let objectPath: string;
    try {
      const json = Buffer.from(xGoogSignature, 'base64url').toString('utf8');
      const parsed = JSON.parse(json) as { p?: unknown };
      if (typeof parsed.p !== 'string' || !OBJECT_PATH_PATTERN.test(parsed.p)) {
        throw new BadRequestException('Invalid object path in signature payload');
      }
      objectPath = parsed.p;
    } catch (e) {
      if (e instanceof BadRequestException) {
        throw e;
      }
      throw new BadRequestException('Malformed X-Goog-Signature');
    }

    const bucket = this.firebaseAdminService.getStorage().bucket(this.resolvedBucketName());
    const file = bucket.file(objectPath);
    const [exists] = await file.exists();
    if (!exists) {
      throw new NotFoundException('Object not found');
    }

    const [metadata] = await file.getMetadata();
    const contentType = metadata.contentType ?? 'application/octet-stream';
    const readStream = file.createReadStream();
    readStream.on('error', err => {
      this.logger.warn(`Stream error for ${objectPath}: ${String(err)}`);
    });

    return new StreamableFile(readStream, {
      type: contentType,
    });
  }
}
