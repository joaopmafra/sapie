import * as admin from 'firebase-admin';

/**
 * Study Result Entity
 *
 * Per-user study scheduling state for a single card.
 * Separated from card content so that:
 * - Card content is immutable from a study perspective
 * - Each learner gets their own study results when decks are shared
 * - FSRS upgrade only touches this collection
 */
export interface StudyResult {
  id: string;
  cardId: string;
  userId: string;
  dueDate: Date;
  /** Days until next review (SM-2). */
  interval: number;
  /** Consecutive "know" count. */
  repetitions: number;
  /** Last study outcome. */
  lastResult: 'know' | 'dont_know' | null;
  /** When last studied. */
  lastStudied: Date | null;
  /** Total "know" responses. */
  correctCount: number;
  /** Total "don't know" responses. */
  incorrectCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Study Result Document
 *
 * Firestore shape for {@link StudyResult}.
 */
export interface StudyResultDocument {
  cardId: string;
  userId: string;
  dueDate: admin.firestore.Timestamp;
  interval: number;
  repetitions: number;
  lastResult: 'know' | 'dont_know' | null;
  lastStudied: admin.firestore.Timestamp | null;
  correctCount: number;
  incorrectCount: number;
  createdAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
}
