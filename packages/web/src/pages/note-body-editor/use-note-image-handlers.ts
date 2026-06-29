import type {
  ImagePreviewHandler,
  ImageUploadHandler,
} from '@mdxeditor/editor';
import type { User } from 'firebase/auth';
import { useCallback, useEffect, useRef } from 'react';

import {
  attachmentBodyMarkdownUrl,
  parseAttachmentBodyUrl,
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

export type StagedAttachment = {
  noteId: string;
  attachmentId: string;
};

export function useNoteImageHandlers(
  currentUser: User | null | undefined,
  noteId: string | undefined,
  onImageInserted?: () => void,
  onUploadError?: (error: unknown) => void,
  onAttachmentStaged?: (staged: StagedAttachment) => void
): {
  imageUploadHandler: ImageUploadHandler;
  imagePreviewHandler: ImagePreviewHandler;
  uploadImageAttachment: (file: File) => Promise<string>;
  clearStagedAttachments: () => StagedAttachment[];
} {
  const blobUrlCacheRef = useRef(new Map<string, string>());
  const inflightPreviewRef = useRef(new Map<string, Promise<string>>());
  const stagedAttachmentsRef = useRef<StagedAttachment[]>([]);

  useEffect(() => {
    const cache = blobUrlCacheRef.current;
    const inflight = inflightPreviewRef.current;
    stagedAttachmentsRef.current = [];
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

  const clearStagedAttachments = useCallback((): StagedAttachment[] => {
    const staged = [...stagedAttachmentsRef.current];
    stagedAttachmentsRef.current = [];
    return staged;
  }, []);

  const uploadImageAttachment = useCallback(
    async (file: File): Promise<string> => {
      if (!currentUser || !noteId) {
        throw new Error('Sign in and open a note before inserting images.');
      }

      assertImageUploadWithinSizeLimit(file);

      const attachment = await contentService.createAttachment(
        currentUser,
        noteId
      );
      await contentService.putAttachmentBodyFile(
        currentUser,
        noteId,
        attachment.id,
        file,
        file.type || 'application/octet-stream'
      );
      const markdownUrl = attachmentBodyMarkdownUrl(noteId, attachment.id);
      seedPreviewCache(markdownUrl, file);
      const staged = { noteId, attachmentId: attachment.id };
      stagedAttachmentsRef.current.push(staged);
      onAttachmentStaged?.(staged);
      return markdownUrl;
    },
    [currentUser, noteId, seedPreviewCache, onAttachmentStaged]
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
      const attachmentRef = parseAttachmentBodyUrl(imageSource);
      if (attachmentRef) {
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

        const promise = (async () => {
          try {
            const blob = await contentService.fetchAttachmentBodyBlob(
              currentUser,
              attachmentRef.noteId,
              attachmentRef.attachmentId
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
      }

      // Legacy Story 71 URLs during migration
      if (isContentBodyUrl(imageSource)) {
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
      }

      return imageSource;
    },
    [currentUser]
  );

  return {
    imageUploadHandler,
    imagePreviewHandler,
    uploadImageAttachment,
    clearStagedAttachments,
  };
}
