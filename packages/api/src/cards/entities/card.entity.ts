import * as admin from 'firebase-admin';

/**
 * Card Entity Interface
 *
 * Represents a flashcard in the domain model.
 * Cards belong to a deck and store study state for FSRS upgrade path.
 */
export interface Card {
  id: string;
  deckId: string;
  ownerId: string;
  front: string;
  back: string;
  dueDate: Date;
  interval: number;
  repetitions: number;
  lastResult: 'know' | 'dont_know' | null;
  lastStudied: Date | null;
  correctCount: number;
  incorrectCount: number;
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
  front: string;
  back: string;
  dueDate: admin.firestore.Timestamp;
  interval: number;
  repetitions: number;
  lastResult: 'know' | 'dont_know' | null;
  lastStudied: admin.firestore.Timestamp | null;
  correctCount: number;
  incorrectCount: number;
  deleted?: boolean;
  deletedAt?: admin.firestore.Timestamp | null;
  createdAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
}
