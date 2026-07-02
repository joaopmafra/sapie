import axios from 'axios';
import { FirebaseRefreshResponse, FirebaseSignInResponse } from '../api/types';
import { AuthTokens, deleteTokens, readTokens, updateTokens, writeTokens } from './token-store';

export interface AuthConfig {
  apiKey: string;
}

/**
 * Firebase Auth REST API service.
 * Handles email/password sign-in and token refresh.
 */
export class AuthService {
  private readonly authBaseUrl: string;

  constructor(private config: AuthConfig) {
    this.authBaseUrl = 'https://identitytoolkit.googleapis.com/v1';
  }

  /**
   * Sign in with email and password using Firebase Auth REST API.
   */
  async signInWithPassword(
    workspaceRoot: string,
    email: string,
    password: string
  ): Promise<AuthTokens> {
    const url = `${this.authBaseUrl}/accounts:signInWithPassword?key=${this.config.apiKey}`;
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
      const url = `https://securetoken.googleapis.com/v1/token?key=${this.config.apiKey}`;
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
}
