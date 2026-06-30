import axios from 'axios';
import type { User } from 'firebase/auth';

import { getApiAuthRequestOptions } from '../auth-utils';
import { getApiBaseUrl } from '../apiBaseUrl.ts';

import type { Card, CreateCardRequest, UpdateCardRequest } from './types';

/**
 * Card Service
 *
 * Handles all card-related API operations. Each card belongs to a deck;
 * the deck is identified by its content ID (`deckId`). All methods require
 * authentication and automatically include the user's Firebase ID token.
 */
export class CardService {
  /**
   * Lists all cards in a deck.
   * GET /api/content/:deckId/cards
   */
  async getCards(currentUser: User, deckId: string): Promise<Card[]> {
    try {
      const options = await getApiAuthRequestOptions(currentUser);
      const basePath = getApiBaseUrl().replace(/\/$/, '');

      const response = await axios.get<Card[]>(
        `${basePath}/api/content/${deckId}/cards`,
        options
      );

      return response.data;
    } catch (error) {
      console.error('Failed to get cards:', error);
      throw error;
    }
  }

  /**
   * Creates a new card in a deck.
   * POST /api/content/:deckId/cards
   */
  async createCard(
    currentUser: User,
    deckId: string,
    front: string,
    back: string
  ): Promise<Card> {
    try {
      const options = await getApiAuthRequestOptions(currentUser);
      const basePath = getApiBaseUrl().replace(/\/$/, '');

      const body: CreateCardRequest = { front, back };

      const response = await axios.post<Card>(
        `${basePath}/api/content/${deckId}/cards`,
        body,
        options
      );

      return response.data;
    } catch (error) {
      console.error('Failed to create card:', error);
      throw error;
    }
  }

  /**
   * Updates an existing card.
   * PATCH /api/content/:deckId/cards/:cardId
   */
  async updateCard(
    currentUser: User,
    deckId: string,
    cardId: string,
    front: string,
    back: string
  ): Promise<Card> {
    try {
      const options = await getApiAuthRequestOptions(currentUser);
      const basePath = getApiBaseUrl().replace(/\/$/, '');

      const body: UpdateCardRequest = { front, back };

      const response = await axios.patch<Card>(
        `${basePath}/api/content/${deckId}/cards/${cardId}`,
        body,
        options
      );

      return response.data;
    } catch (error) {
      console.error('Failed to update card:', error);
      throw error;
    }
  }

  /**
   * Deletes a card.
   * DELETE /api/content/:deckId/cards/:cardId
   */
  async deleteCard(
    currentUser: User,
    deckId: string,
    cardId: string
  ): Promise<void> {
    try {
      const options = await getApiAuthRequestOptions(currentUser);
      const basePath = getApiBaseUrl().replace(/\/$/, '');

      await axios.delete(
        `${basePath}/api/content/${deckId}/cards/${cardId}`,
        options
      );
    } catch (error) {
      console.error('Failed to delete card:', error);
      throw error;
    }
  }

  /**
   * Records a study result for a card.
   * PATCH /api/content/:deckId/cards/:cardId/study-result
   */
  async recordStudyResult(
    currentUser: User,
    deckId: string,
    cardId: string,
    result: 'know' | 'dont_know',
  ): Promise<Card> {
    const options = await getApiAuthRequestOptions(currentUser);
    const basePath = getApiBaseUrl().replace(/\/$/, '');
    const response = await axios.patch<Card>(
      `${basePath}/api/content/${deckId}/cards/${cardId}/study-result`,
      { result },
      options,
    );
    return response.data;
  }
}

export const cardService = new CardService();
