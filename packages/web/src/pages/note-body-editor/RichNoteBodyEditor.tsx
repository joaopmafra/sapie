import {
  MDXEditor,
  BlockTypeSelect,
  BoldItalicUnderlineToggles,
  CreateLink,
  InsertCodeBlock,
  InsertImage,
  ListsToggle,
  Separator,
  UndoRedo,
  codeBlockPlugin,
  codeMirrorPlugin,
  headingsPlugin,
  imagePlugin,
  linkDialogPlugin,
  linkPlugin,
  listsPlugin,
  markdownShortcutPlugin,
  toolbarPlugin,
  type MDXEditorMethods,
} from '@mdxeditor/editor';
import '@mdxeditor/editor/style.css';
import { Box } from '@mui/material';
import { forwardRef, useMemo } from 'react';

import { noteBodyToolbarTranslation } from './mdxEditorTranslation';
import type { NoteBodyEditorProps } from './note-body-editor-props';
import { NoteImageInsertDialog } from './NoteImageInsertDialog';
import './rich-note-body-content.css';

export const RichNoteBodyEditor = forwardRef<
  MDXEditorMethods | null,
  NoteBodyEditorProps
>(function RichNoteBodyEditor(
  {
    value,
    onChange,
    placeholder,
    disabled,
    'aria-label': _ariaLabel,
    imageUploadHandler,
    imagePreviewHandler,
  },
  ref
) {
  const plugins = useMemo(
    () => [
      headingsPlugin(),
      listsPlugin(),
      linkPlugin(),
      linkDialogPlugin(),
      ...(imageUploadHandler != null
        ? [
            imagePlugin({
              imageUploadHandler,
              imagePreviewHandler: imagePreviewHandler ?? undefined,
              ImageDialog: NoteImageInsertDialog,
            }),
          ]
        : []),
      codeBlockPlugin(),
      codeMirrorPlugin({
        codeBlockLanguages: {
          txt: 'Plain text',
          js: 'JavaScript',
          ts: 'TypeScript',
          tsx: 'TypeScript (React)',
          jsx: 'JavaScript (React)',
          css: 'CSS',
          md: 'Markdown',
          json: 'JSON',
        },
        autoLoadLanguageSupport: true,
      }),
      markdownShortcutPlugin(),
      toolbarPlugin({
        toolbarContents: () => (
          <>
            <UndoRedo />
            <Separator />
            <BoldItalicUnderlineToggles />
            <Separator />
            <ListsToggle />
            <Separator />
            <BlockTypeSelect />
            <Separator />
            <CreateLink />
            <Separator />
            {imageUploadHandler != null ? (
              <>
                <InsertImage />
                <Separator />
              </>
            ) : null}
            <InsertCodeBlock />
          </>
        ),
      }),
    ],
    [imageUploadHandler, imagePreviewHandler]
  );

  return (
    <Box className='sapie-rich-note-body' sx={{ minHeight: 360 }}>
      <MDXEditor
        ref={ref}
        markdown={value}
        onChange={(md, initialMarkdownNormalize) =>
          onChange(md, { fromInitialNormalize: initialMarkdownNormalize })
        }
        placeholder={placeholder}
        readOnly={disabled}
        translation={noteBodyToolbarTranslation}
        plugins={plugins}
        contentEditableClassName='sapie-mdx-content'
      />
    </Box>
  );
});
