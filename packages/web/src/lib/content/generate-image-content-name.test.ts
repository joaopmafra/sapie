import { generateUniqueImageContentName } from './generate-image-content-name';

describe('generateUniqueImageContentName', () => {
  it('appends a unique suffix so repeated uploads do not collide', () => {
    const file = new File([new Uint8Array(1)], 'image.png', {
      type: 'image/png',
    });
    const first = generateUniqueImageContentName(file);
    const second = generateUniqueImageContentName(file);
    expect(first).not.toBe(second);
    expect(first).toMatch(/^image-[a-z0-9]+\.png$/);
  });

  it('derives the extension from the file type', () => {
    const file = new File([new Uint8Array(1)], 'clipboard', {
      type: 'image/webp',
    });
    expect(generateUniqueImageContentName(file)).toMatch(/\.webp$/);
  });
});
