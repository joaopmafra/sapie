import * as http from 'http';

const SUCCESS_HTML = `<!DOCTYPE html>
<html>
<head><title>Sapie - Authenticated</title></head>
<body>
<h1>Authentication Successful</h1>
<p>You can close this window and return to the terminal.</p>
</body>
</html>`;

const ERROR_HTML = `<!DOCTYPE html>
<html>
<head><title>Sapie - Authentication Failed</title></head>
<body>
<h1>Authentication Failed</h1>
<p>An error occurred during authentication. Please try again.</p>
</body>
</html>`;

let currentServer: http.Server | null = null;

/**
 * Start an HTTP server on a random port to receive the OAuth callback.
 * Returns the assigned port and a promise that resolves with the authorization code.
 *
 * @param timeoutMs - Timeout in milliseconds before rejecting (default 120s)
 */
export async function startOAuthServer(timeoutMs = 120_000): Promise<{
  port: number;
  waitForCode: Promise<string>;
}> {
  // Close any previously running server (shouldn't happen in normal flow)
  if (currentServer) {
    currentServer.close();
    currentServer = null;
  }

  const { port, server } = await new Promise<{ port: number; server: http.Server }>((resolve) => {
    const srv = http.createServer();
    srv.listen(0, '127.0.0.1', () => {
      const addr = srv.address() as { port: number };
      resolve({ port: addr.port, server: srv });
    });
  });

  currentServer = server;

  let timeoutHandle: NodeJS.Timeout;

  const waitForCode = new Promise<string>((resolve, reject) => {
    server.on('request', (req, res) => {
      const url = new URL(req.url || '/', `http://127.0.0.1:${port}`);

      if (url.pathname !== '/callback') {
        res.writeHead(404);
        res.end();
        return;
      }

      const code = url.searchParams.get('code');
      const error = url.searchParams.get('error');

      clearTimeout(timeoutHandle);

      if (error) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end(ERROR_HTML);
        closeServer();
        reject(new Error(`OAuth error: ${error}`));
        return;
      }

      if (code) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(SUCCESS_HTML);
        closeServer();
        resolve(code);
        return;
      }

      // Neither code nor error present
      res.writeHead(400, { 'Content-Type': 'text/html' });
      res.end(ERROR_HTML);
      closeServer();
      reject(new Error('No authorization code or error in callback'));
    });

    timeoutHandle = setTimeout(() => {
      closeServer();
      reject(new Error(`OAuth server timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  return { port, waitForCode };
}

/**
 * Stop the currently running OAuth server, if any.
 * Safe to call even if no server is running.
 */
export function stopOAuthServer(): void {
  closeServer();
}

function closeServer(): void {
  if (currentServer) {
    currentServer.close();
    currentServer = null;
  }
}
