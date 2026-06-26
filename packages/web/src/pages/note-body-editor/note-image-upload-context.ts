import { createContext, useContext } from 'react';

export type NoteImageUploadActions = {
  uploadImageAttachment: (file: File) => Promise<string>;
  onImageInserted: () => void;
  onUploadError: (error: unknown) => void;
};

export const NoteImageUploadContext =
  createContext<NoteImageUploadActions | null>(null);

export function useNoteImageUploadActions(): NoteImageUploadActions {
  const ctx = useContext(NoteImageUploadContext);
  if (!ctx) {
    throw new Error('NoteImageUploadContext is missing');
  }
  return ctx;
}
