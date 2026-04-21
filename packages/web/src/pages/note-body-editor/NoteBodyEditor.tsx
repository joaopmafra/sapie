import type { MDXEditorMethods } from '@mdxeditor/editor';
import { Box, CircularProgress } from '@mui/material';
import React, { Suspense, lazy } from 'react';

import { getNoteBodyEditorVariant } from '../../config/noteBodyEditorVariant';

import type { NoteBodyEditorProps } from './note-body-editor-props';
import { PlainNoteBodyEditor } from './PlainNoteBodyEditor';

const RichNoteBodyEditorLazy = lazy(async () => {
  const m = await import('./RichNoteBodyEditor');
  return { default: m.RichNoteBodyEditor };
});

export type NoteBodyEditorComponentProps = NoteBodyEditorProps & {
  richEditorRef?: React.Ref<MDXEditorMethods | null>;
};

export function NoteBodyEditor({
  richEditorRef,
  ...props
}: NoteBodyEditorComponentProps) {
  if (getNoteBodyEditorVariant() === 'plain') {
    return <PlainNoteBodyEditor {...props} />;
  }

  return (
    <Suspense
      fallback={
        <Box
          sx={{
            minHeight: 360,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <CircularProgress size={32} />
        </Box>
      }
    >
      <RichNoteBodyEditorLazy ref={richEditorRef} {...props} />
    </Suspense>
  );
}
