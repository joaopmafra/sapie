// Re-export everything from the generated API client
export * from './api';
export * from './base';
export * from './common';
export * from './configuration';

// Create a default configuration
import { Configuration } from './configuration';

export const createApiConfiguration = (basePath?: string) => {
  return new Configuration({
    basePath: basePath || '',
  });
};
