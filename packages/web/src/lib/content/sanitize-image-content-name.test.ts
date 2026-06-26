import { sanitizeImageContentName } from './sanitize-image-content-name';

describe('sanitizeImageContentName', () => {
  it('strips path segments and illegal characters', () => {
    expect(sanitizeImageContentName('/tmp/my:shot.png')).toBe('my-shot.png');
  });

  it('falls back to image when empty', () => {
    expect(sanitizeImageContentName('///')).toBe('image');
  });
});
