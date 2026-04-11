import { Injectable } from '@nestjs/common';

/**
 * Optional test double for {@link NoteBodyStorageService}.
 *
 * Default `ContentController` tests use the **Storage emulator** (classical fake). Call
 * `ContentControllerFixture.withFakeNoteBodyStorage()` before `init()` when you need fully
 * deterministic uploads/signed URLs without emulator quirks (e.g. rare edge cases).
 */
@Injectable()
export class FakeNoteBodyStorageService {
  lastUpload: { ownerId: string; contentId: string; markdown: string } | null = null;

  objectPath(ownerId: string, contentId: string): string {
    return `${ownerId}/content/${contentId}`;
  }

  uploadMarkdown(
    ownerId: string,
    contentId: string,
    markdown: string
  ): Promise<{ bodyUri: string; size: number }> {
    this.lastUpload = { ownerId, contentId, markdown };
    const size = Buffer.byteLength(markdown, 'utf8');
    const bodyUri = `${ownerId}/content/${contentId}`;
    return Promise.resolve({ bodyUri, size });
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
