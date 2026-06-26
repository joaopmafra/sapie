import {
  contentBodyApiPath,
  contentBodyMarkdownUrl,
  isContentBodyUrl,
  parseContentBodyUrl,
} from './content-body-url';

type SapieViteEnvGlobal = typeof globalThis & {
  __SAPIE_VITE_API_BASE_URL__?: string;
};

describe('content-body-url', () => {
  afterEach(() => {
    delete (globalThis as SapieViteEnvGlobal).__SAPIE_VITE_API_BASE_URL__;
  });

  it('builds stable API path', () => {
    expect(contentBodyApiPath('img-1')).toBe('/api/content/img-1/body');
  });

  it('parses relative and absolute content body URLs', () => {
    expect(parseContentBodyUrl('/api/content/abc/body')).toBe('abc');
    expect(
      parseContentBodyUrl('http://127.0.0.1:5000/api/content/xyz/body')
    ).toBe('xyz');
    expect(
      parseContentBodyUrl('https://example.com/api/content/id-9/body?x=1')
    ).toBe('id-9');
  });

  it('rejects non-content-body URLs', () => {
    expect(isContentBodyUrl('/api/content/abc/body/signed-url')).toBe(false);
    expect(isContentBodyUrl('https://cdn.example/image.png')).toBe(false);
  });

  it('respects VITE_API_BASE_URL for markdown URLs', () => {
    const g = globalThis as SapieViteEnvGlobal;
    g.__SAPIE_VITE_API_BASE_URL__ = 'http://127.0.0.1:5000';
    expect(contentBodyMarkdownUrl('img-2')).toBe(
      'http://127.0.0.1:5000/api/content/img-2/body'
    );

    delete g.__SAPIE_VITE_API_BASE_URL__;
    expect(contentBodyMarkdownUrl('img-2')).toBe('/api/content/img-2/body');
  });
});
