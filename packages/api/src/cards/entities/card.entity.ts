import * as admin from 'firebase-admin';

/**
 * Card Entity Interface
 *
 * Represents a flashcard in the domain model.
 * Card content is immutable from a study perspective — study state lives in the
 * separate `study_results` collection.
 */
export interface Card {
  id: string;
  deckId: string;
  ownerId: string;
  /** Ordinal position within the deck (0-based, monotonically assigned). */
  position: number;
  /** Question/prompt — markdown, JSON-native escaping. */
  front: string;
  /** Answer — markdown, JSON-native escaping. */
  back: string;
  deleted?: boolean;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Card Document Interface
 *
 * Firestore shape for {@link Card}. Uses `admin.firestore.Timestamp`
 * in place of `Date` for fields stored in Firestore.
 */
export interface CardDocument {
  deckId: string;
  ownerId: string;
  position: number;
  front: string;
  back: string;
  deleted?: boolean;
  deletedAt?: admin.firestore.Timestamp | null;
  createdAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
}
