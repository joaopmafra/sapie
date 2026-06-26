import type {
  ImagePreviewHandler,
  ImageUploadHandler,
} from '@mdxeditor/editor';
import { isAxiosError } from 'axios';
import type { User } from 'firebase/auth';
import { useCallback, useEffect, useRef } from 'react';

import { assertImageUploadWithinSizeLimit } from '../../lib/content/content-body-limits';
import {
  contentBodyMarkdownUrl,
  isContentBodyUrl,
  parseContentBodyUrl,
} from '../../lib/content/content-body-url';
import { contentService } from '../../lib/content/content-service';
import { generateUniqueImageContentName } from '../../lib/content/generate-image-content-name';

/** Shown when authenticated body fetch fails (404/403/network). Avoids uncaught preview rejections. */
const UNAVAILABLE_IMAGE_PREVIEW =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" fill="#f5f5f5"/><text x="32" y="36" text-anchor="middle" font-family="sans-serif" font-size="10" fill="#999">Unavailable</text></svg>'
  );

const MAX_NAME_COLLISION_RETRIES = 5;

function isNameConflictError(error: unknown): boolean {
  return isAxiosError(error) && error.response?.status === 409;
}

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
  const blobUrlCacheRef = useRef(new Map<string, string>());
  const inflightPreviewRef = useRef(new Map<string, Promise<string>>());

  useEffect(() => {
    const cache = blobUrlCacheRef.current;
    const inflight = inflightPreviewRef.current;
    return () => {
      for (const url of cache.values()) {
        URL.revokeObjectURL(url);
      }
      cache.clear();
      inflight.clear();
    };
  }, [noteId]);

  const seedPreviewCache = useCallback((markdownUrl: string, file: File) => {
    const existing = blobUrlCacheRef.current.get(markdownUrl);
    if (existing) {
      URL.revokeObjectURL(existing);
    }
    blobUrlCacheRef.current.set(markdownUrl, URL.createObjectURL(file));
  }, []);

  const uploadImageAttachment = useCallback(
    async (file: File): Promise<string> => {
      if (!currentUser || !noteId) {
        throw new Error('Sign in and open a note before inserting images.');
      }

      assertImageUploadWithinSizeLimit(file);

      for (let attempt = 0; attempt < MAX_NAME_COLLISION_RETRIES; attempt++) {
        const contentName = generateUniqueImageContentName(file);
        try {
          const image = await contentService.createImage(
            currentUser,
            contentName,
            noteId
          );
          await contentService.putContentBodyFile(
            currentUser,
            image.id,
            file,
            file.type || 'application/octet-stream'
          );
          const markdownUrl = contentBodyMarkdownUrl(image.id);
          seedPreviewCache(markdownUrl, file);
          return markdownUrl;
        } catch (error) {
          if (isNameConflictError(error)) {
            continue;
          }
          throw error;
        }
      }

      throw new Error('Could not create image attachment. Try again.');
    },
    [currentUser, noteId, seedPreviewCache]
  );

  const imageUploadHandler = useCallback(
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

  const imagePreviewHandler = useCallback(
    async (imageSource: string) => {
      if (!isContentBodyUrl(imageSource)) {
        return imageSource;
      }

      const cached = blobUrlCacheRef.current.get(imageSource);
      if (cached) {
        return cached;
      }

      const inflight = inflightPreviewRef.current.get(imageSource);
      if (inflight) {
        return inflight;
      }

      if (!currentUser) {
        return imageSource;
      }

      const contentId = parseContentBodyUrl(imageSource);
      if (!contentId) {
        return imageSource;
      }

      const promise = (async () => {
        try {
          const blob = await contentService.fetchContentBodyBlob(
            currentUser,
            contentId
          );
          const blobUrl = URL.createObjectURL(blob);
          blobUrlCacheRef.current.set(imageSource, blobUrl);
          return blobUrl;
        } catch {
          return UNAVAILABLE_IMAGE_PREVIEW;
        }
      })();

      inflightPreviewRef.current.set(imageSource, promise);
      try {
        return await promise;
      } finally {
        inflightPreviewRef.current.delete(imageSource);
      }
    },
    [currentUser]
  );

  return { imageUploadHandler, imagePreviewHandler, uploadImageAttachment };
}
