import {
  assertImageUploadWithinSizeLimit,
  CONTENT_BODY_MAX_BYTES,
  formatContentBodyMaxSizeMb,
} from './content-body-limits';

describe('content-body-limits', () => {
  it('rejects files over the max byte limit', () => {
    const tooLarge = new File(
      [new Uint8Array(CONTENT_BODY_MAX_BYTES + 1)],
      'big.png',
      { type: 'image/png' }
    );
    expect(() => assertImageUploadWithinSizeLimit(tooLarge)).toThrow(
      formatContentBodyMaxSizeMb()
    );
  });

  it('allows files at or under the limit', () => {
    const ok = new File([new Uint8Array(1024)], 'ok.png', {
      type: 'image/png',
    });
    expect(() => assertImageUploadWithinSizeLimit(ok)).not.toThrow();
  });
});
