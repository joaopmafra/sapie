/**
 * Environment configuration derived from a --url parameter.
 * Maps known hostnames to their Firebase config and API base URL.
 * Firebase web API keys are public by design — they only identify a project.
 */
export interface EnvironmentConfig {
  apiBaseUrl: string;
  firebaseApiKey: string;
  firebaseAuthDomain: string;
  googleClientId?: string;
  authEmulatorHost?: string;
}

const ENVIRONMENTS: Record<string, EnvironmentConfig> = {
  localhost: {
    apiBaseUrl: 'http://localhost:3000/api',
    firebaseApiKey: 'demo-api-key',
    firebaseAuthDomain: 'demo-local-dev.firebaseapp.com',
    authEmulatorHost: 'localhost:9100',
  },
  'sapie-b09be.web.app': {
    apiBaseUrl: 'https://sapie-b09be.web.app/api',
    firebaseApiKey: 'AIzaSyDph9PtuHDZf_Ia_LUbiKmwvfkKC9upGQE',
    firebaseAuthDomain: 'sapie-b09be.firebaseapp.com',
    // googleClientId: not yet configured for staging; Google OAuth will fail until set
  },
  'sapie.app': {
    apiBaseUrl: 'https://sapie.app/api',
    firebaseApiKey: '', // TBD — sapie.app is future prod, not yet provisioned
    firebaseAuthDomain: 'sapie.app',
  },
};

/**
 * Resolve environment config from a user-supplied URL string.
 * Parses protocol and hostname to match known environments or builds a custom config.
 */
export function resolveEnvironment(rawUrl: string): EnvironmentConfig {
  let url: URL;
  try {
    url = new URL(rawUrl.includes('://') ? rawUrl : `https://${rawUrl}`);
  } catch {
    console.error(`✗ Invalid URL: ${rawUrl}`);
    process.exit(1);
  }

  const hostname = url.hostname;

  // Exact match for known environments
  if (hostname === 'localhost') return ENVIRONMENTS['localhost'];
  if (hostname === 'sapie-b09be.web.app') return ENVIRONMENTS['sapie-b09be.web.app'];
  if (hostname === 'sapie.app') return ENVIRONMENTS['sapie.app'];

  // Custom URL — build config from the URL, leaving Firebase fields empty
  // (user must provide Firebase config separately or use API key auth)
  const protocol = url.protocol.replace(':', '');
  const port = url.port ? `:${url.port}` : '';
  return {
    apiBaseUrl: `${protocol}://${hostname}${port}/api`,
    firebaseApiKey: '',
    firebaseAuthDomain: '',
  };
}
