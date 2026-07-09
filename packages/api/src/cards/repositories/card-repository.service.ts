import { Injectable, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { FirebaseAdminService } from '../../firebase';
import { Card, CardDocument } from '../entities/card.entity';

@Injectable()
export class CardRepository {
  private readonly logger = new Logger(CardRepository.name);
  private readonly cardsCollectionName = 'cards';

  constructor(private readonly firebaseAdminService: FirebaseAdminService) {}

  private get firestore(): admin.firestore.Firestore {
    return this.firebaseAdminService.getFirestore();
  }

  private cardsCollection(): admin.firestore.CollectionReference<admin.firestore.DocumentData> {
    return this.firestore.collection(this.cardsCollectionName);
  }

  async findById(cardId: string): Promise<Card | null> {
    const doc = await this.cardsCollection().doc(cardId).get();

    if (!doc.exists) {
      return null;
    }

    const data = doc.data();
    if (!data) return null;
    return this.convertDocumentToCard(doc.id, data);
  }

  /** Returns all non-deleted cards in a deck, ordered by position. */
  async findByDeckId(deckId: string): Promise<Card[]> {
    const snapshot = await this.cardsCollection()
      .where('deckId', '==', deckId)
      .where('deleted', '==', false)
      .orderBy('position', 'asc')
      .get();

    return snapshot.docs
      .map(d => this.convertDocumentToCard(d.id, d.data()!))
      .filter((c): c is Card => c !== null);
  }

  /** Returns non-deleted cards in a deck, ordered by position (includes all, not just due). */
  async findByDeckIds(deckIds: string[]): Promise<Card[]> {
    if (deckIds.length === 0) return [];

    // Firestore `in` supports up to 30 values
    const snapshot = await this.cardsCollection()
      .where('deckId', 'in', deckIds)
      .where('deleted', '==', false)
      .get();

    return snapshot.docs
      .map(d => this.convertDocumentToCard(d.id, d.data()!))
      .filter((c): c is Card => c !== null)
      .sort((a, b) => a.position - b.position);
  }

  async addCard(params: {
    deckId: string;
    ownerId: string;
    front: string;
    back: string;
    position: number;
  }): Promise<Card> {
    const now = new Date();

    const newCardData = {
      deckId: params.deckId,
      ownerId: params.ownerId,
      position: params.position,
      front: params.front,
      back: params.back,
      deleted: false,
      createdAt: admin.firestore.Timestamp.fromDate(now),
      updatedAt: admin.firestore.Timestamp.fromDate(now),
    };

    const docRef = await this.cardsCollection().add(newCardData);

    return {
      id: docRef.id,
      deckId: params.deckId,
      ownerId: params.ownerId,
      position: params.position,
      front: params.front,
      back: params.back,
      deleted: false,
      createdAt: now,
      updatedAt: now,
    };
  }

  async updateCard(
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

    await this.cardsCollection().doc(cardId).update(updateData);
  }

  async softDeleteCard(cardId: string, deletedAt: Date): Promise<void> {
    await this.cardsCollection()
      .doc(cardId)
      .update({
        deleted: true,
        deletedAt: admin.firestore.Timestamp.fromDate(deletedAt),
        updatedAt: admin.firestore.Timestamp.fromDate(deletedAt),
      });
  }

  /**
   * Soft-deletes all non-deleted cards belonging to a deck.
   */
  async softDeleteCardsByDeckId(deckId: string): Promise<void> {
    const snapshot = await this.cardsCollection()
      .where('deckId', '==', deckId)
      .where('deleted', '==', false)
      .get();

    if (snapshot.empty) return;

    const now = admin.firestore.Timestamp.fromDate(new Date());
    const batch = this.firestore.batch();

    for (const doc of snapshot.docs) {
      batch.update(doc.ref, {
        deleted: true,
        deletedAt: now,
        updatedAt: now,
      });
    }

    await batch.commit();
  }

  /**
   * Returns the next position value for a new card in the deck.
   */
  async getNextPosition(deckId: string): Promise<number> {
    const snapshot = await this.cardsCollection()
      .where('deckId', '==', deckId)
      .where('deleted', '==', false)
      .orderBy('position', 'desc')
      .limit(1)
      .get();

    if (snapshot.empty) return 0;
    const data = snapshot.docs[0].data();
    return (data?.['position'] ?? -1) + 1;
  }

  private convertDocumentToCard(id: string, data: FirebaseFirestore.DocumentData): Card | null {
    if (!data || typeof data !== 'object') return null;
    if (typeof data['deckId'] !== 'string') return null;

    return {
      id,
      deckId: data['deckId'],
      ownerId: typeof data['ownerId'] === 'string' ? data['ownerId'] : '',
      position: typeof data['position'] === 'number' ? data['position'] : 0,
      front: typeof data['front'] === 'string' ? data['front'] : '',
      back: typeof data['back'] === 'string' ? data['back'] : '',
      deleted: typeof data['deleted'] === 'boolean' ? data['deleted'] : undefined,
      deletedAt: data['deletedAt'] && typeof data['deletedAt'].toDate === 'function' ? data['deletedAt'].toDate() : null,
      createdAt: data['createdAt'] && typeof data['createdAt'].toDate === 'function' ? data['createdAt'].toDate() : new Date(),
      updatedAt: data['updatedAt'] && typeof data['updatedAt'].toDate === 'function' ? data['updatedAt'].toDate() : new Date(),
    };
  }
}
