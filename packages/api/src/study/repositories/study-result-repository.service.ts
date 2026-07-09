import { Injectable, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { FirebaseAdminService } from '../../firebase';
import { StudyResult } from '../entities/study-result.entity';

@Injectable()
export class StudyResultRepository {
  private readonly logger = new Logger(StudyResultRepository.name);
  private readonly collectionName = 'study_results';

  constructor(private readonly firebaseAdminService: FirebaseAdminService) {}

  private get firestore(): admin.firestore.Firestore {
    return this.firebaseAdminService.getFirestore();
  }

  private collection(): admin.firestore.CollectionReference<admin.firestore.DocumentData> {
    return this.firestore.collection(this.collectionName);
  }

  async findOrCreate(cardId: string, userId: string): Promise<StudyResult> {
    // Query for existing study result by (cardId, userId)
    const snapshot = await this.collection()
      .where('cardId', '==', cardId)
      .where('userId', '==', userId)
      .limit(1)
      .get();

    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      const data = doc.data();
      const existing = this.convertToStudyResult(doc.id, data);
      if (existing) return existing;
    }

    // Create a new study result
    const now = new Date();
    const newData = {
      cardId,
      userId,
      dueDate: admin.firestore.Timestamp.fromDate(now),
      interval: 0,
      repetitions: 0,
      lastResult: null,
      lastStudied: null,
      correctCount: 0,
      incorrectCount: 0,
      createdAt: admin.firestore.Timestamp.fromDate(now),
      updatedAt: admin.firestore.Timestamp.fromDate(now),
    };

    const docRef = await this.collection().add(newData);

    return {
      id: docRef.id,
      cardId,
      userId,
      dueDate: now,
      interval: 0,
      repetitions: 0,
      lastResult: null,
      lastStudied: null,
      correctCount: 0,
      incorrectCount: 0,
      createdAt: now,
      updatedAt: now,
    };
  }

  /** Returns study results for cards that are due (dueDate <= now) for a user. */
  async findDueResults(userId: string, cardIds: string[]): Promise<StudyResult[]> {
    if (cardIds.length === 0) return [];

    const now = admin.firestore.Timestamp.now();
    const snapshot = await this.collection()
      .where('userId', '==', userId)
      .where('cardId', 'in', cardIds)
      .where('dueDate', '<=', now)
      .get();

    return snapshot.docs
      .map(d => this.convertToStudyResult(d.id, d.data()))
      .filter((r): r is StudyResult => r !== null)
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  }

  /** Returns ALL study results for a user (not just due). */
  async findByUserAndCardIds(userId: string, cardIds: string[]): Promise<StudyResult[]> {
    if (cardIds.length === 0) return [];

    const snapshot = await this.collection()
      .where('userId', '==', userId)
      .where('cardId', 'in', cardIds)
      .get();

    return snapshot.docs
      .map(d => this.convertToStudyResult(d.id, d.data()))
      .filter((r): r is StudyResult => r !== null)
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  }

  async updateStudyState(
    resultId: string,
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
    await this.collection()
      .doc(resultId)
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

  private convertToStudyResult(id: string, data: FirebaseFirestore.DocumentData): StudyResult | null {
    if (!data || typeof data !== 'object') return null;
    if (typeof data['cardId'] !== 'string' || typeof data['userId'] !== 'string') return null;

    return {
      id,
      cardId: data['cardId'],
      userId: data['userId'],
      dueDate: data['dueDate'] && typeof data['dueDate'].toDate === 'function' ? data['dueDate'].toDate() : new Date(),
      interval: typeof data['interval'] === 'number' ? data['interval'] : 0,
      repetitions: typeof data['repetitions'] === 'number' ? data['repetitions'] : 0,
      lastResult: data['lastResult'] === 'know' || data['lastResult'] === 'dont_know' ? data['lastResult'] : null,
      lastStudied: data['lastStudied'] && typeof data['lastStudied'].toDate === 'function' ? data['lastStudied'].toDate() : null,
      correctCount: typeof data['correctCount'] === 'number' ? data['correctCount'] : 0,
      incorrectCount: typeof data['incorrectCount'] === 'number' ? data['incorrectCount'] : 0,
      createdAt: data['createdAt'] && typeof data['createdAt'].toDate === 'function' ? data['createdAt'].toDate() : new Date(),
      updatedAt: data['updatedAt'] && typeof data['updatedAt'].toDate === 'function' ? data['updatedAt'].toDate() : new Date(),
    };
  }
}
