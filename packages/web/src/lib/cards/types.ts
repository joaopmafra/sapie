/**
 * Card Entity Interface
 *
 * Represents a flashcard within a deck. Each card belongs to a deck
 * (parentId = deckId) and stores two-sided content with study tracking fields.
 */
export interface Card {
  id: string;
  deckId: string;
  ownerId: string;
  front: string;
  back: string;
  dueDate: string;
  interval: number;
  repetitions: number;
  lastResult: 'know' | 'dont_know' | null;
  lastStudied: string | null;
  correctCount: number;
  incorrectCount: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Request payload for creating a new card.
 */
export interface CreateCardRequest {
  front: string;
  back: string;
}

/**
 * Request payload for updating an existing card.
 * All fields are optional — only provided fields are changed.
 */
export interface UpdateCardRequest {
  front?: string;
  back?: string;
}
