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
import { ContentType } from '../../content/entities/content.entity';

@Injectable()
export class CardService {
  private readonly logger = new Logger(CardService.name);

  constructor(
    private readonly cardRepository: CardRepository,
    private readonly contentRepository: ContentRepository
  ) {}

  async createCard(deckId: string, ownerId: string, front: string, back: string): Promise<Card> {
    const deck = await this.validateDeckOwnership(deckId, ownerId);

    if (deck.type !== ContentType.DECK) {
      throw new BadRequestException(`Content with ID ${deckId} is not a deck`);
    }

    return this.cardRepository.addCard({ deckId, ownerId, front, back });
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

    const card = await this.cardRepository.findById(cardId, deckId);
    if (!card || card.deleted) {
      throw new NotFoundException(`Card with ID ${cardId} not found in deck ${deckId}`);
    }

    const updates: { front?: string; back?: string; updatedAt: Date } = {
      updatedAt: new Date(),
    };
    if (front !== undefined) updates.front = front;
    if (back !== undefined) updates.back = back;

    await this.cardRepository.updateCard(deckId, cardId, updates);

    const updated = await this.cardRepository.findById(cardId, deckId);
    if (!updated) {
      throw new NotFoundException(`Card with ID ${cardId} not found after update`);
    }

    return updated;
  }

  async deleteCard(deckId: string, cardId: string, ownerId: string): Promise<void> {
    await this.validateDeckOwnership(deckId, ownerId);

    const card = await this.cardRepository.findById(cardId, deckId);
    if (!card || card.deleted) {
      throw new NotFoundException(`Card with ID ${cardId} not found in deck ${deckId}`);
    }

    await this.cardRepository.softDeleteCard(deckId, cardId, new Date());
  }

  async deleteCardsForDeck(deckId: string): Promise<void> {
    await this.cardRepository.deleteCardsByDeckId(deckId);
  }

  /**
   * Returns due cards in a deck (non-deleted, dueDate <= now), ordered by dueDate ascending.
   */
  async findDueCards(deckId: string): Promise<Card[]> {
    return this.cardRepository.findDueCards(deckId);
  }

  /**
   * Records a study result for a card and applies the SM-2 spaced repetition algorithm.
   */
  async recordStudyResult(
    deckId: string,
    cardId: string,
    ownerId: string,
    result: 'know' | 'dont_know'
  ): Promise<Card> {
    const deck = await this.validateDeckOwnership(deckId, ownerId);

    if (deck.type !== ContentType.DECK) {
      throw new BadRequestException(`Content with ID ${deckId} is not a deck`);
    }

    const card = await this.cardRepository.findById(cardId, deckId);
    if (!card) {
      throw new NotFoundException(`Card with ID ${cardId} not found`);
    }
    if (card.deleted) {
      throw new NotFoundException(`Card with ID ${cardId} not found`);
    }

    const now = new Date();
    let interval: number;
    let repetitions: number;
    let dueDate: Date;
    let correctCount: number;
    let incorrectCount: number;

    if (result === 'know') {
      repetitions = card.repetitions + 1;
      interval = Math.min(2 ** repetitions, 365); // days, capped at ~1 year
      dueDate = new Date(now.getTime() + interval * 24 * 60 * 60 * 1000);
      correctCount = card.correctCount + 1;
      incorrectCount = card.incorrectCount;
    } else {
      repetitions = 0;
      interval = 0;
      dueDate = now; // due immediately
      correctCount = card.correctCount;
      incorrectCount = card.incorrectCount + 1;
    }

    await this.cardRepository.updateCardStudyState(deckId, cardId, {
      dueDate,
      interval,
      repetitions,
      lastResult: result,
      lastStudied: now,
      correctCount,
      incorrectCount,
    });

    // Return updated card
    const updated = await this.cardRepository.findById(cardId, deckId);
    if (!updated) {
      throw new Error(`Card with ID ${cardId} disappeared after update`);
    }
    return updated;
  }

  /**
   * Counts due cards in a deck (non-deleted, dueDate <= now).
   */
  async countDueCards(deckId: string): Promise<number> {
    return this.cardRepository.countDueCards(deckId);
  }

  private async validateDeckOwnership(deckId: string, ownerId: string) {
    const deck = await this.contentRepository.findById(deckId);

    if (!deck) {
      throw new NotFoundException(`Deck with ID ${deckId} not found`);
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
