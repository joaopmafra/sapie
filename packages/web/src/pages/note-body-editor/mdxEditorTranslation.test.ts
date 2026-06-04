import {
  applyMdxEditorInterpolations,
  noteBodyToolbarTranslation,
} from './mdxEditorTranslation';

describe('noteBodyToolbarTranslation', () => {
  it('replaces heading level placeholders', () => {
    expect(
      noteBodyToolbarTranslation(
        'toolbar.blockTypes.heading',
        'Heading {{level}}',
        {
          level: 2,
        }
      )
    ).toBe('Heading 2');
  });

  it('overrides content area label', () => {
    expect(
      noteBodyToolbarTranslation(
        'contentArea.editableMarkdown',
        'Editable markdown'
      )
    ).toBe('Note body');
  });
});

describe('applyMdxEditorInterpolations', () => {
  it('returns default when interpolations are omitted', () => {
    expect(applyMdxEditorInterpolations('Block type')).toBe('Block type');
  });
});
