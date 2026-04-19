/**
 * Content Library Exports
 *
 * This file exports all public interfaces, types, and services from the content library.
 */

// Types and interfaces
export type {
  Content,
  ContentCreationInput,
  UpdateContentRequest,
} from './types';

export type { CreateContentRequest } from '../api-client';

export { ContentType } from './types';

// Services
export { ContentService, contentService } from './content-service';

export { contentQueryKeys } from './query-keys';

export type { UseContentBodyOptions } from './content-hooks';
export {
  useRootDirectory,
  useFolderChildren,
  useBodySignedUrlFetchSuppressedAfterSave,
  useContentBody,
  useContentItem,
  useCreateNote,
  useNoteBody,
  useRenameContent,
  useSaveNoteBody,
} from './content-hooks';
