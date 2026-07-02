import * as crypto from 'crypto';
import * as child_process from 'child_process';
import axios from 'axios';
import { FirebaseRefreshResponse, FirebaseSignInResponse } from '../api/types';
import { AuthTokens, deleteTokens, readTokens, updateTokens, writeTokens } from './token-store';
import { startOAuthServer, stopOAuthServer } from './oauth-server';

export interface AuthConfig {
  apiKey: string;
  authDomain: string;
  googleClientId?: string;
  authEmulatorHost?: string;
}

/**
 * Firebase Auth REST API service.
 * Handles email/password sign-in, Google OAuth sign-in, and token refresh.
 */
export class AuthService {
  private readonly identityBaseUrl: string;

  constructor(private config: AuthConfig) {
    this.identityBaseUrl = this.resolveIdentityBaseUrl();
  }

  /**
   * Build the base URL for identity toolkit calls, respecting the auth emulator.
   */
  private resolveIdentityBaseUrl(): string {
    if (this.config.authEmulatorHost) {
      return `http://${this.config.authEmulatorHost}/identitytoolkit.googleapis.com/v1`;
    }
    return 'https://identitytoolkit.googleapis.com/v1';
  }

  /**
   * Build a full identity toolkit URL for a given path (e.g. "/accounts:signInWithPassword").
   * The key query param is included automatically ("fake" for emulator).
   */
  private getIdentityToolkitUrl(path: string): string {
    const key = this.config.authEmulatorHost ? 'fake' : this.config.apiKey;
    return `${this.identityBaseUrl}${path}?key=${key}`;
  }

  /**
   * Build the Google OAuth consent URL that will redirect back to the local callback server.
   */
  getGoogleOAuthUrl(port: number, state: string): string {
    const clientId = this.config.googleClientId;
    if (!clientId) {
      throw new Error(
        'Google Client ID is not configured. Set googleClientId in .sapie/config.json.\n' +
          'Find it at Firebase Console > Authentication > Sign-in method > Google > Web client ID.'
      );
    }
    const redirectUri = `http://127.0.0.1:${port}/callback`;
    const scope = encodeURIComponent('openid email profile');
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope,
      state,
      access_type: 'offline',
      prompt: 'select_account',
    });

    if (this.config.authEmulatorHost) {
      return `http://${this.config.authEmulatorHost}/emulator/auth/handler?${params.toString()}`;
    }

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  /**
   * Sign in with Google OAuth.
   *
   * 1. Starts a local HTTP server to receive the OAuth callback.
   * 2. Opens the browser to the Google consent screen.
   * 3. Waits for the authorization code.
   * 4. Exchanges the code for Firebase tokens via signInWithIdp.
   * 5. Stores the tokens.
   */
  async signInWithGoogle(workspaceRoot: string): Promise<AuthTokens> {
    const state = crypto.randomBytes(16).toString('hex');

    // Start the local callback server
    const { port, waitForCode } = await startOAuthServer();

    // Build and display the OAuth URL
    const authUrl = this.getGoogleOAuthUrl(port, state);
    console.log(`\nOpening browser for Google sign-in...`);
    console.log(`If the browser doesn't open, visit:\n${authUrl}\n`);

    // Try to open the browser
    this.openBrowser(authUrl);

    try {
      // Wait for the authorization code from the callback
      const code = await waitForCode;

      // Exchange the auth code for Firebase tokens
      const url = this.getIdentityToolkitUrl('/accounts:signInWithIdp');
      const response = await axios.post<FirebaseSignInResponse>(url, {
        postBody: `providerId=google.com&code=${encodeURIComponent(code)}&redirect_uri=http://127.0.0.1:${port}/callback`,
        requestUri: 'http://localhost',
        returnSecureToken: true,
      });

      return writeTokens(workspaceRoot, response.data);
    } finally {
      stopOAuthServer();
    }
  }

  /**
   * Sign in with email and password using Firebase Auth REST API.
   */
  async signInWithPassword(
    workspaceRoot: string,
    email: string,
    password: string
  ): Promise<AuthTokens> {
    const url = this.getIdentityToolkitUrl('/accounts:signInWithPassword');
    const response = await axios.post<FirebaseSignInResponse>(url, {
      email,
      password,
      returnSecureToken: true,
    });
    return writeTokens(workspaceRoot, response.data);
  }

  /**
   * Get a valid ID token, refreshing if necessary.
   * Returns null if not authenticated.
   */
  async getValidToken(workspaceRoot: string): Promise<string | null> {
    const tokens = await readTokens(workspaceRoot);
    if (!tokens) return null;

    // Refresh if expiring within 5 minutes
    if (Date.now() > tokens.expiresAt - 5 * 60 * 1000) {
      return this.refreshToken(workspaceRoot, tokens);
    }

    return tokens.idToken;
  }

  /**
   * Refresh the ID token using the refresh token.
   */
  private async refreshToken(workspaceRoot: string, tokens: AuthTokens): Promise<string | null> {
    try {
      const key = this.config.authEmulatorHost ? 'fake' : this.config.apiKey;
      const url = `https://securetoken.googleapis.com/v1/token?key=${key}`;
      const response = await axios.post<FirebaseRefreshResponse>(url, {
        grant_type: 'refresh_token',
        refresh_token: tokens.refreshToken,
      });

      const data = response.data;
      await updateTokens(
        workspaceRoot,
        tokens,
        data.id_token,
        data.refresh_token,
        parseInt(data.expires_in, 10)
      );

      return data.id_token;
    } catch {
      // Refresh failed — clear tokens
      await deleteTokens(workspaceRoot);
      return null;
    }
  }

  /**
   * Log out — delete stored tokens.
   */
  async logout(workspaceRoot: string): Promise<void> {
    await deleteTokens(workspaceRoot);
  }

  /**
   * Attempt to open a URL in the default browser.
   * Falls back to printing the URL on failure or when no display is available.
   */
  private openBrowser(url: string): void {
    const platform = process.platform;
    let command: string;
    if (platform === 'darwin') {
      command = `open "${url}"`;
    } else if (platform === 'win32') {
      command = `start "" "${url}"`;
    } else {
      command = `xdg-open "${url}"`;
    }

    try {
      child_process.exec(command, (err) => {
        if (err) {
          console.log(`Could not open browser automatically.`);
          console.log(`Please visit:\n${url}\n`);
        }
      });
    } catch {
      console.log(`Could not open browser automatically.`);
      console.log(`Please visit:\n${url}\n`);
    }
  }
}
