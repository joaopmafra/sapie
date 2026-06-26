import { createContext, useContext } from 'react';

export type NoteImageUploadActions = {
  uploadImageAttachment: (file: File, nameStem?: string) => Promise<string>;
  onImageInserted: () => void;
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
