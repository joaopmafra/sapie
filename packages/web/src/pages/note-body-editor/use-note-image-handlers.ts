import type {
  ImagePreviewHandler,
  ImageUploadHandler,
} from '@mdxeditor/editor';
import type { User } from 'firebase/auth';
import { useCallback } from 'react';

import {
  blobMarkdownUrl,
  parseBlobUrl,
  isContentBodyUrl,
  parseContentBodyUrl,
} from '../../lib/content/attachment-body-url';
import { assertImageUploadWithinSizeLimit } from '../../lib/content/content-body-limits';
import { contentService } from '../../lib/content/content-service';

/** Shown when authenticated body fetch fails (404/403/network). Avoids uncaught preview rejections. */
const UNAVAILABLE_IMAGE_PREVIEW =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" fill="#f5f5f5"/><text x="32" y="36" text-anchor="middle" font-family="sans-serif" font-size="10" fill="#999">Unavailable</text></svg>'
  );

export function useNoteImageHandlers(
  currentUser: User | null | undefined,
  noteId: string | undefined,
  onImageInserted?: () => void,
  onUploadError?: (error: unknown) => void
): {
  imageUploadHandler: ImageUploadHandler;
  imagePreviewHandler: ImagePreviewHandler;
  uploadImageAttachment: (file: File) => Promise<string>;
} {
  const uploadImageAttachment = useCallback(
    async (file: File): Promise<string> => {
      if (!currentUser || !noteId) {
        throw new Error('Sign in and open a note before inserting images.');
      }

      assertImageUploadWithinSizeLimit(file);

      const result = await contentService.uploadBlob(currentUser, noteId, file);
      return blobMarkdownUrl(noteId, result.blobId);
    },
    [currentUser, noteId]
  );

  const imageUploadHandler = useCallback<NonNullable<ImageUploadHandler>>(
    async (file: File) => {
      try {
        const url = await uploadImageAttachment(file);
        onImageInserted?.();
        return url;
      } catch (error) {
        onUploadError?.(error);
        throw error;
      }
    },
    [uploadImageAttachment, onImageInserted, onUploadError]
  );

  const imagePreviewHandler = useCallback<NonNullable<ImagePreviewHandler>>(
    async (imageSource: string) => {
      // New blob URLs: /api/content/{contentId}/blobs/{blobId}
      const blobRef = parseBlobUrl(imageSource);
      if (blobRef) {
        if (!currentUser) {
          return imageSource;
        }

        try {
          const blob = await contentService.fetchBlob(
            currentUser,
            blobRef.contentId,
            blobRef.blobId
          );
          return URL.createObjectURL(blob);
        } catch {
          return UNAVAILABLE_IMAGE_PREVIEW;
        }
      }

      // Legacy Story 71 URLs during migration fallback
      if (isContentBodyUrl(imageSource)) {
        if (!currentUser) {
          return imageSource;
        }
        const contentId = parseContentBodyUrl(imageSource);
        if (!contentId) {
          return imageSource;
        }
        try {
          const blob = await contentService.fetchContentBodyBlob(
            currentUser,
            contentId
          );
          return URL.createObjectURL(blob);
        } catch {
          return UNAVAILABLE_IMAGE_PREVIEW;
        }
      }

      return imageSource;
    },
    [currentUser]
  );

  return {
    imageUploadHandler,
    imagePreviewHandler,
    uploadImageAttachment,
  };
}
