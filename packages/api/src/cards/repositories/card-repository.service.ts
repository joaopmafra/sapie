import { Injectable, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { FirebaseAdminService } from '../../firebase';
import { Card, CardDocument } from '../entities/card.entity';

@Injectable()
export class CardRepository {
  private readonly logger = new Logger(CardRepository.name);

  constructor(private readonly firebaseAdminService: FirebaseAdminService) {}

  private get firestore(): admin.firestore.Firestore {
    return this.firebaseAdminService.getFirestore();
  }

  private cardsCollection(
    deckId: string
  ): admin.firestore.CollectionReference<admin.firestore.DocumentData> {
    return this.firestore.collection('content').doc(deckId).collection('cards');
  }

  async findById(cardId: string, deckId: string): Promise<Card | null> {
    const doc = await this.cardsCollection(deckId).doc(cardId).get();

    if (!doc.exists) {
      return null;
    }

    return this.convertDocumentToCard(doc.id, doc.data() as CardDocument);
  }

  async findByDeckId(deckId: string): Promise<Card[]> {
    const snapshot = await this.cardsCollection(deckId).get();

    return snapshot.docs
      .map(d => this.convertDocumentToCard(d.id, d.data() as CardDocument))
      .filter(c => !c.deleted)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  /**
   * Returns non-deleted cards in a deck that are due for review (dueDate <= now),
   * ordered by dueDate ascending (oldest due first).
   */
  async findDueCards(deckId: string): Promise<Card[]> {
    const now = admin.firestore.Timestamp.now();
    const snapshot = await this.cardsCollection(deckId)
      .where('dueDate', '<=', now)
      .where('deleted', '==', false)
      .get();

    return snapshot.docs
      .map(d => this.convertDocumentToCard(d.id, d.data() as CardDocument))
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  }

  async addCard(params: {
    deckId: string;
    ownerId: string;
    front: string;
    back: string;
  }): Promise<Card> {
    const now = new Date();

    const newCardData: CardDocument = {
      deckId: params.deckId,
      ownerId: params.ownerId,
      front: params.front,
      back: params.back,
      dueDate: admin.firestore.Timestamp.fromDate(now),
      interval: 0,
      repetitions: 0,
      lastResult: null,
      lastStudied: null,
      correctCount: 0,
      incorrectCount: 0,
      deleted: false,
      createdAt: admin.firestore.Timestamp.fromDate(now),
      updatedAt: admin.firestore.Timestamp.fromDate(now),
    };

    const docRef = await this.cardsCollection(params.deckId).add(newCardData);

    return this.convertDocumentToCard(docRef.id, newCardData);
  }

  async updateCard(
    deckId: string,
    cardId: string,
    updates: { front?: string; back?: string; updatedAt?: Date }
  ): Promise<void> {
    const updateData: Record<string, unknown> = {};

    if (updates.front !== undefined) {
      updateData.front = updates.front;
    }

    if (updates.back !== undefined) {
      updateData.back = updates.back;
    }

    if (updates.updatedAt !== undefined) {
      updateData.updatedAt = admin.firestore.Timestamp.fromDate(updates.updatedAt);
    }

    await this.cardsCollection(deckId).doc(cardId).update(updateData);
  }

  /**
   * Atomically updates card scheduling fields after a study result is recorded.
   */
  async updateCardStudyState(
    deckId: string,
    cardId: string,
    updates: {
      dueDate: Date;
      interval: number;
      repetitions: number;
      lastResult: 'know' | 'dont_know';
      lastStudied: Date;
      correctCount: number;
      incorrectCount: number;
    }
  ): Promise<void> {
    await this.cardsCollection(deckId)
      .doc(cardId)
      .update({
        dueDate: admin.firestore.Timestamp.fromDate(updates.dueDate),
        interval: updates.interval,
        repetitions: updates.repetitions,
        lastResult: updates.lastResult,
        lastStudied: admin.firestore.Timestamp.fromDate(updates.lastStudied),
        correctCount: updates.correctCount,
        incorrectCount: updates.incorrectCount,
        updatedAt: admin.firestore.Timestamp.fromDate(updates.lastStudied),
      });
  }

  async softDeleteCard(deckId: string, cardId: string, deletedAt: Date): Promise<void> {
    await this.cardsCollection(deckId)
      .doc(cardId)
      .update({
        deleted: true,
        deletedAt: admin.firestore.Timestamp.fromDate(deletedAt),
        updatedAt: admin.firestore.Timestamp.fromDate(deletedAt),
      });
  }

  /**
   * Counts non-deleted cards in a deck where `dueDate <= now`.
   */
  async countDueCards(deckId: string): Promise<number> {
    const now = admin.firestore.Timestamp.now();
    const snapshot = await this.cardsCollection(deckId)
      .where('dueDate', '<=', now)
      .where('deleted', '==', false)
      .count()
      .get();
    return snapshot.data().count;
  }
  async deleteCardsByDeckId(deckId: string): Promise<void> {
    const snapshot = await this.cardsCollection(deckId).get();

    const nonDeleted = snapshot.docs.filter(d => !d.data().deleted);

    const now = admin.firestore.Timestamp.fromDate(new Date());

    const batch = this.firestore.batch();

    for (const doc of nonDeleted) {
      batch.update(doc.ref, {
        deleted: true,
        deletedAt: now,
        updatedAt: now,
      });
    }

    await batch.commit();
  }

  private convertDocumentToCard(id: string, data: CardDocument): Card {
    return {
      id,
      deckId: data.deckId,
      ownerId: data.ownerId,
      front: data.front,
      back: data.back,
      dueDate: data.dueDate.toDate(),
      interval: data.interval,
      repetitions: data.repetitions,
      lastResult: data.lastResult,
      lastStudied: data.lastStudied?.toDate() ?? null,
      correctCount: data.correctCount,
      incorrectCount: data.incorrectCount,
      deleted: data.deleted,
      deletedAt: data.deletedAt?.toDate() ?? null,
      createdAt: data.createdAt.toDate(),
      updatedAt: data.updatedAt.toDate(),
    };
  }
}
