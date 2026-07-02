import axios, { AxiosInstance, AxiosError } from 'axios';
import {
  CardResponse,
  ContentResponse,
  CreateCardRequest,
  CreateContentRequest,
  ProblemDetails,
  UpdateCardRequest,
  UpdateContentRequest,
} from './types';

/**
 * Typed API error wrapping Problem Details (RFC 7807).
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly problem?: ProblemDetails
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Typed HTTP client for the Sapie REST API.
 * Injects the Firebase ID token on every request.
 */
export class ApiClient {
  private readonly http: AxiosInstance;
  private tokenProvider: (() => Promise<string | null>) | null = null;

  constructor(baseUrl: string) {
    this.http = axios.create({
      baseURL: baseUrl,
      timeout: 30_000,
      headers: { 'Content-Type': 'application/json' },
    });

    this.http.interceptors.request.use(async (config) => {
      if (this.tokenProvider) {
        const token = await this.tokenProvider();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
      return config;
    });

    this.http.interceptors.response.use(
      (response) => response,
      (error: AxiosError<ProblemDetails>) => {
        if (error.response) {
          const problem = error.response.data as ProblemDetails | undefined;
          throw new ApiError(
            problem?.detail || problem?.title || error.message,
            error.response.status,
            problem
          );
        }
        throw new ApiError(error.message, 0);
      }
    );
  }

  /** Set the token provider (called before requests). */
  setTokenProvider(provider: () => Promise<string | null>): void {
    this.tokenProvider = provider;
  }

  // ── Content endpoints ──

  async getRoot(): Promise<ContentResponse> {
    const { data } = await this.http.get<ContentResponse>('/content/root');
    return data;
  }

  async getContent(id: string): Promise<ContentResponse> {
    const { data } = await this.http.get<ContentResponse>(`/content/${id}`);
    return data;
  }

  async listChildren(parentId: string): Promise<ContentResponse[]> {
    const { data } = await this.http.get<ContentResponse[]>(`/content/${parentId}/children`);
    return data;
  }

  async getBody(id: string): Promise<string | null> {
    try {
      const { data } = await this.http.get<string>(`/content/${id}/body`, {
        responseType: 'text',
        headers: { Accept: 'text/plain, text/markdown, */*' },
      });
      return data;
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        return null;
      }
      throw err;
    }
  }

  async putBody(
    id: string,
    body: string | Buffer,
    contentType: string,
    expectedRevision: string
  ): Promise<ContentResponse> {
    const { data } = await this.http.put<ContentResponse>(`/content/${id}/body`, body, {
      headers: { 'Content-Type': contentType },
      params: { expectedRevision },
    });
    return data;
  }

  async createContent(request: CreateContentRequest): Promise<ContentResponse> {
    const { data } = await this.http.post<ContentResponse>('/content', request);
    return data;
  }

  async patchContent(id: string, request: UpdateContentRequest): Promise<ContentResponse> {
    const { data } = await this.http.patch<ContentResponse>(`/content/${id}`, request);
    return data;
  }

  async deleteContent(id: string, cascade: boolean = true): Promise<void> {
    await this.http.delete(`/content/${id}`, { params: { cascade } });
  }

  // ── Card endpoints ──

  async getCards(deckId: string): Promise<CardResponse[]> {
    const { data } = await this.http.get<CardResponse[]>(`/content/${deckId}/cards`);
    return data;
  }

  async createCard(deckId: string, request: CreateCardRequest): Promise<CardResponse> {
    const { data } = await this.http.post<CardResponse>(`/content/${deckId}/cards`, request);
    return data;
  }

  async updateCard(
    deckId: string,
    cardId: string,
    request: UpdateCardRequest
  ): Promise<CardResponse> {
    const { data } = await this.http.patch<CardResponse>(
      `/content/${deckId}/cards/${cardId}`,
      request
    );
    return data;
  }

  async deleteCard(deckId: string, cardId: string): Promise<void> {
    await this.http.delete(`/content/${deckId}/cards/${cardId}`);
  }
}
