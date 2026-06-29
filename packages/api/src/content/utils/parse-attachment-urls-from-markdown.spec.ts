import { parseReferencedAttachmentIds } from './parse-attachment-urls-from-markdown';

describe('parseReferencedAttachmentIds', () => {
  const noteId = 'note-123';
  const attachmentId = 'att-456';

  it('parses relative attachment body URLs', () => {
    const markdown = `![x](/api/content/${noteId}/attachments/${attachmentId}/body)`;
    expect(parseReferencedAttachmentIds(markdown, noteId)).toEqual(new Set([attachmentId]));
  });

  it('parses absolute attachment body URLs', () => {
    const markdown = `![](https://api.example.com/api/content/${noteId}/attachments/${attachmentId}/body)`;
    expect(parseReferencedAttachmentIds(markdown, noteId)).toEqual(new Set([attachmentId]));
  });

  it('ignores references to other notes', () => {
    const markdown = `![](/api/content/other-note/attachments/${attachmentId}/body)`;
    expect(parseReferencedAttachmentIds(markdown, noteId)).toEqual(new Set());
  });

  it('ignores legacy content body URLs', () => {
    const markdown = '![](/api/content/old-image-id/body)';
    expect(parseReferencedAttachmentIds(markdown, noteId)).toEqual(new Set());
  });
});
