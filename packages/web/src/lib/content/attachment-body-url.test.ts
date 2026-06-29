import {
  attachmentBodyApiPath,
  attachmentBodyMarkdownUrl,
} from './attachment-body-url';

describe('attachmentBodyMarkdownUrl', () => {
  it('builds note-scoped attachment body path', () => {
    expect(attachmentBodyApiPath('note-1', 'att-2')).toBe(
      '/api/content/note-1/attachments/att-2/body'
    );
    expect(attachmentBodyMarkdownUrl('note-1', 'att-2')).toMatch(
      /\/api\/content\/note-1\/attachments\/att-2\/body$/
    );
  });
});
