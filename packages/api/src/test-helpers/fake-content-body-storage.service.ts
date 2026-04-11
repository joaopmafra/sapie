import { Injectable } from '@nestjs/common';

/**
 * Optional test double for {@link ContentBodyStorageService}.
 *
 * Default `ContentController` tests use the **Storage emulator** (classical fake). Call
 * `ContentControllerFixture.withFakeContentBodyStorage()` before `init()` when you need fully
 * deterministic uploads/signed URLs without emulator quirks (e.g. rare edge cases).
 */
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

  getSignedReadUrl(storedReference: string): Promise<{ signedUrl: string; expiresAt: Date }> {
    const pathMatch = storedReference.match(/\/content\/([^/]+)$/);
    const id = pathMatch?.[1] ?? 'unknown';
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    return Promise.resolve({
      signedUrl: `https://fake-signed.example/${id}`,
      expiresAt,
    });
  }
}
