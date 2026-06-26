import type {
  ImagePreviewHandler,
  ImageUploadHandler,
} from '@mdxeditor/editor';
import type { User } from 'firebase/auth';
import { useCallback, useEffect, useRef } from 'react';

import {
  contentBodyMarkdownUrl,
  isContentBodyUrl,
  parseContentBodyUrl,
} from '../../lib/content/content-body-url';
import { contentService } from '../../lib/content/content-service';
import { sanitizeImageContentName } from '../../lib/content/sanitize-image-content-name';

export function useNoteImageHandlers(
  currentUser: User | null | undefined,
  noteId: string | undefined
): {
  imageUploadHandler: ImageUploadHandler;
  imagePreviewHandler: ImagePreviewHandler;
} {
  const blobUrlCacheRef = useRef(new Map<string, string>());

  useEffect(() => {
    const cache = blobUrlCacheRef.current;
    return () => {
      for (const url of cache.values()) {
        URL.revokeObjectURL(url);
      }
      cache.clear();
    };
  }, [noteId]);

  const imageUploadHandler = useCallback(
    async (file: File) => {
      if (!currentUser || !noteId) {
        throw new Error('Sign in and open a note before inserting images.');
      }

      const name = sanitizeImageContentName(file.name);
      const image = await contentService.createImage(currentUser, name, noteId);
      await contentService.putContentBodyFile(
        currentUser,
        image.id,
        file,
        file.type || 'application/octet-stream'
      );
      return contentBodyMarkdownUrl(image.id);
    },
    [currentUser, noteId]
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

      if (!currentUser) {
        return imageSource;
      }

      const contentId = parseContentBodyUrl(imageSource);
      if (!contentId) {
        return imageSource;
      }

      const blob = await contentService.fetchContentBodyBlob(
        currentUser,
        contentId
      );
      const blobUrl = URL.createObjectURL(blob);
      blobUrlCacheRef.current.set(imageSource, blobUrl);
      return blobUrl;
    },
    [currentUser]
  );

  return { imageUploadHandler, imagePreviewHandler };
}
