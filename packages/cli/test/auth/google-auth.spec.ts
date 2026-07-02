import * as http from 'http';
import { startOAuthServer, stopOAuthServer } from '../../src/lib/auth/oauth-server';

/** Helper: make an HTTP GET request and return the raw http.IncomingMessage. */
function httpGet(url: string): Promise<{ statusCode: number; body: string }> {
  return new Promise((resolve, reject) => {
    http
      .get(url, (res) => {
        let data = '';
        res.on('data', (chunk: Buffer) => {
          data += chunk.toString();
        });
        res.on('end', () => resolve({ statusCode: res.statusCode ?? 0, body: data }));
      })
      .on('error', reject);
  });
}

/** Helper: attempt a connection to verify the port is freed. */
function tryConnect(port: number): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const req = http.get(`http://127.0.0.1:${port}/`, (res) => {
      res.resume();
      reject(new Error(`Connected unexpectedly, status: ${res.statusCode}`));
    });
    req.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'ECONNREFUSED') {
        resolve();
      } else {
        reject(err);
      }
    });
    req.setTimeout(2000, () => {
      req.destroy();
      reject(new Error('Connection timed out — port may still be in use'));
    });
  });
}

describe('oauth-server', () => {
  afterEach(() => {
    stopOAuthServer();
  });

  // ── G1: server starts on a random port ──

  it('startOAuthServer returns a port number and the server is listening', async () => {
    const { port, waitForCode } = await startOAuthServer();

    expect(typeof port).toBe('number');
    expect(port).toBeGreaterThan(0);
    expect(waitForCode).toBeInstanceOf(Promise);

    // Make a request to a non-callback path to verify the server is listening.
    const res = await httpGet(`http://127.0.0.1:${port}/`);
    expect(res.statusCode).toBe(404);
  });

  // ── G2: callback receives a code ──

  it('resolves with the authorization code when callback includes code', async () => {
    const { port, waitForCode } = await startOAuthServer();

    // Fire the callback request; don't await it — we want to test waitForCode.
    const responsePromise = httpGet(`http://127.0.0.1:${port}/callback?code=my-auth-code`);

    const code = await waitForCode;
    expect(code).toBe('my-auth-code');

    // The HTTP response should be the success HTML.
    const res = await responsePromise;
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('Authentication Successful');
  });

  // ── G3: callback receives an error ──

  it('rejects when callback includes an error parameter', async () => {
    const { port, waitForCode } = await startOAuthServer();

    const responsePromise = httpGet(`http://127.0.0.1:${port}/callback?error=access_denied`);

    await expect(waitForCode).rejects.toThrow('OAuth error: access_denied');

    const res = await responsePromise;
    expect(res.statusCode).toBe(400);
    expect(res.body).toContain('Authentication Failed');
  });

  // ── G4: server stops cleanly ──

  it('frees the port after stopOAuthServer', async () => {
    const { port } = await startOAuthServer();

    stopOAuthServer();

    // Port should now be available (connection refused).
    await expect(tryConnect(port)).resolves.toBeUndefined();
  });

  // ── G5: server times out ──

  it('rejects after the timeout elapses without a callback', async () => {
    const { waitForCode } = await startOAuthServer(100);

    await expect(waitForCode).rejects.toThrow('timed out after 100ms');
  }, 5000); // Jest timeout — must exceed the OAuth timeout + overhead.
});
