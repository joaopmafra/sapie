import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Card } from '../entities/card.entity';
import { CardRepository } from '../repositories/card-repository.service';
import { ContentRepository } from '../../content/repositories/content-repository.service';
import { StudyResultRepository } from '../../study/repositories/study-result-repository.service';

@Injectable()
export class CardService {
  private readonly logger = new Logger(CardService.name);

  constructor(
    private readonly cardRepository: CardRepository,
    private readonly contentRepository: ContentRepository,
    private readonly studyResultRepository: StudyResultRepository
  ) {}
  async createCard(deckId: string, ownerId: string, front: string, back: string): Promise<Card> {
    await this.validateDeckOwnership(deckId, ownerId);

    const position = await this.cardRepository.getNextPosition(deckId);

    const card = await this.cardRepository.addCard({ deckId, ownerId, front, back, position });

    // Create initial study result so the card shows up as "due immediately"
    await this.studyResultRepository.findOrCreate(card.id, ownerId);

    return card;
  }

  async getCards(deckId: string, ownerId: string): Promise<Card[]> {
    await this.validateDeckOwnership(deckId, ownerId);

    return this.cardRepository.findByDeckId(deckId);
  }

  async updateCard(
    deckId: string,
    cardId: string,
    ownerId: string,
    front?: string,
    back?: string
  ): Promise<Card> {
    await this.validateDeckOwnership(deckId, ownerId);

    const card = await this.cardRepository.findById(cardId);
    if (!card || card.deleted || card.deckId !== deckId) {
      throw new NotFoundException(`Card with ID ${cardId} not found in deck ${deckId}`);
    }

    const updates: { front?: string; back?: string; updatedAt: Date } = {
      updatedAt: new Date(),
    };
    if (front !== undefined) updates.front = front;
    if (back !== undefined) updates.back = back;

    await this.cardRepository.updateCard(cardId, updates);

    const updated = await this.cardRepository.findById(cardId);
    if (!updated) {
      throw new NotFoundException(`Card with ID ${cardId} not found after update`);
    }

    return updated;
  }

  async deleteCard(deckId: string, cardId: string, ownerId: string): Promise<void> {
    await this.validateDeckOwnership(deckId, ownerId);

    const card = await this.cardRepository.findById(cardId);
    if (!card || card.deleted || card.deckId !== deckId) {
      throw new NotFoundException(`Card with ID ${cardId} not found in deck ${deckId}`);
    }

    await this.cardRepository.softDeleteCard(cardId, new Date());
  }

  /** Soft-deletes all non-deleted cards for a deck. */
  async deleteCardsForDeck(deckId: string): Promise<void> {
    await this.cardRepository.softDeleteCardsByDeckId(deckId);
  }

  /**
   * Records a study result for a card and applies the SM-2 spaced repetition algorithm.
   * Returns the card and the updated study state fields for the HTTP response.
   */
  async recordStudyResult(
    deckId: string,
    cardId: string,
    ownerId: string,
    result: 'know' | 'dont_know'
  ): Promise<{
    card: Card;
    studyState: {
      dueDate: Date;
      interval: number;
      repetitions: number;
      lastResult: 'know' | 'dont_know';
      lastStudied: Date;
      correctCount: number;
      incorrectCount: number;
    };
  }> {
    await this.validateDeckOwnership(deckId, ownerId);

    const card = await this.cardRepository.findById(cardId);
    if (!card || card.deleted || card.deckId !== deckId) {
      throw new NotFoundException(`Card with ID ${cardId} not found`);
    }

    const studyResult = await this.studyResultRepository.findOrCreate(cardId, ownerId);

    const now = new Date();
    let interval: number;
    let repetitions: number;
    let dueDate: Date;
    let correctCount: number;
    let incorrectCount: number;

    if (result === 'know') {
      repetitions = studyResult.repetitions + 1;
      interval = Math.min(2 ** repetitions, 365);
      dueDate = new Date(now.getTime() + interval * 24 * 60 * 60 * 1000);
      correctCount = studyResult.correctCount + 1;
      incorrectCount = studyResult.incorrectCount;
    } else {
      repetitions = 0;
      interval = 0;
      dueDate = now;
      correctCount = studyResult.correctCount;
      incorrectCount = studyResult.incorrectCount + 1;
    }

    await this.studyResultRepository.updateStudyState(studyResult.id, {
      dueDate,
      interval,
      repetitions,
      lastResult: result,
      lastStudied: now,
      correctCount,
      incorrectCount,
    });

    return {
      card,
      studyState: {
        dueDate,
        interval,
        repetitions,
        lastResult: result,
        lastStudied: now,
        correctCount,
        incorrectCount,
      },
    };
  }

  /**
   * Counts due cards in a deck for a specific user.
   */
  async countDueCards(deckId: string, userId: string): Promise<number> {
    const cards = await this.cardRepository.findByDeckId(deckId);
    if (cards.length === 0) return 0;

    const cardIds = cards.map(c => c.id);
    const dueResults = await this.studyResultRepository.findDueResults(userId, cardIds);
    return dueResults.length;
  }

  private async validateDeckOwnership(deckId: string, ownerId: string) {
    const deck = await this.contentRepository.findById(deckId);

    if (!deck) {
      throw new NotFoundException(`Deck with ID ${deckId} not found`);
    }

    if (deck.type !== 'deck') {
      throw new BadRequestException(`Content with ID ${deckId} is not a deck`);
    }

    if (deck.ownerId !== ownerId) {
      throw new ForbiddenException('User is not the owner of the deck');
    }

    if (deck.deleted) {
      throw new BadRequestException('Cannot operate on a deleted deck');
    }

    return deck;
  }
}
