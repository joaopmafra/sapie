import { Injectable } from '@nestjs/common';

/**
 * Optional test double for {@link ContentBodyStorageService}.
 *
 * Default `ContentController` tests use the **Storage emulator** (classical fake). Call
 * `ContentControllerFixture.withFakeContentBodyStorage()` before `init()` when you need fully
 * deterministic uploads without emulator quirks (e.g. rare edge cases). Read URLs still use the
 * `CONTENT_BODY_READ_SERVICE` binding (fake read URL issuer or Firebase implementation).
 */
// TODO: review
@Injectable()
export class FakeContentBodyStorageService {
  lastUpload: { ownerId: string; contentId: string; body: Buffer; mimeType: string } | null = null;

  objectPath(ownerId: string, contentId: string): string {
    return `${ownerId}/content/${contentId}`;
  }

  uploadBody(
    ownerId: string,
    contentId: string,
    body: Buffer,
    mimeType: string
  ): Promise<{ bodyUri: string; size: number }> {
    this.lastUpload = { ownerId, contentId, body, mimeType };
    const bodyUri = `${ownerId}/content/${contentId}`;
    return Promise.resolve({ bodyUri, size: body.length });
  }
}
