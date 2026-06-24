import '@testing-library/jest-dom';
import { TextDecoder, TextEncoder } from 'node:util';

// react-router-dom v7 expects Web APIs in the Jest jsdom environment
if (typeof globalThis.TextEncoder === 'undefined') {
  globalThis.TextEncoder = TextEncoder as typeof globalThis.TextEncoder;
}
if (typeof globalThis.TextDecoder === 'undefined') {
  globalThis.TextDecoder = TextDecoder as typeof globalThis.TextDecoder;
}
if (typeof globalThis.Request === 'undefined') {
  globalThis.Request = class {
    url: string;
    method: string;

    constructor(input: string, init?: RequestInit) {
      this.url = input;
      this.method = init?.method ?? 'GET';
    }
  } as unknown as typeof Request;
}
