import { generateUniqueImageContentName } from './generate-image-content-name';

describe('generateUniqueImageContentName', () => {
  it('appends a unique suffix so repeated file names do not collide', () => {
    const first = generateUniqueImageContentName('image.png');
    const second = generateUniqueImageContentName('image.png');
    expect(first).not.toBe(second);
    expect(first).toMatch(/^image-[a-z0-9]+\.png$/);
  });

  it('uses the provided name stem', () => {
    const name = generateUniqueImageContentName('photo.jpg', 'My diagram');
    expect(name).toMatch(/^My diagram-[a-z0-9]+\.jpg$/);
  });
});
