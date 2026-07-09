import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { ContentRepository } from '../content/repositories/content-repository.service';
import { CardRepository } from '../cards/repositories/card-repository.service';
import { StudyResultRepository } from './repositories/study-result-repository.service';
import { Card } from '../cards/entities/card.entity';
import { StudyResult } from './entities/study-result.entity';

export interface StudyCard {
  id: string;
  front: string;
  back: string;
  dueDate: Date;
  interval: number;
  repetitions: number;
  deckId: string;
  deckName: string;
  noteId: string;
}

export interface DueCardsResponse {
  cards: StudyCard[];
  totalDue: number;
}

@Injectable()
export class StudyService {
  private readonly logger = new Logger(StudyService.name);

  constructor(
    private readonly contentRepository: ContentRepository,
    private readonly cardRepository: CardRepository,
    private readonly studyResultRepository: StudyResultRepository,
  ) {}

  async getDueCards(rootIds: string[], ownerId: string): Promise<DueCardsResponse> {
    if (rootIds.length === 0) {
      return { cards: [], totalDue: 0 };
    }

    const allCards: StudyCard[] = [];

    for (const rootId of rootIds) {
      const root = await this.contentRepository.findById(rootId);
      if (!root || root.ownerId !== ownerId || root.deleted) {
        throw new NotFoundException(`Content root ${rootId} not found`);
      }
      if (root.type !== 'directory') {
        throw new BadRequestException(`Content ${rootId} is not a directory`);
      }

      const descendantIds = await this.contentRepository.findAllDescendantIds(rootId, ownerId);
      const directoryIds = [rootId, ...descendantIds];

      const decks = await this.contentRepository.findDecksByDirectoryIds(directoryIds, ownerId);

      for (const deck of decks) {
        const noteId = deck.parentId ?? 'unknown';
        const cards = await this.cardRepository.findByDeckId(deck.id);
        if (cards.length === 0) continue;

        const cardIds = cards.map(c => c.id);
        const results = await this.studyResultRepository.findDueResults(ownerId, cardIds);
        const resultMap = new Map(results.map(r => [r.cardId, r]));

        for (const card of cards) {
          const result = resultMap.get(card.id);
          if (result) {
            allCards.push({
              id: card.id,
              front: card.front,
              back: card.back,
              dueDate: result.dueDate,
              interval: result.interval,
              repetitions: result.repetitions,
              deckId: deck.id,
              deckName: deck.name,
              noteId,
            });
          }
        }
      }
    }

    allCards.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

    return { cards: allCards, totalDue: allCards.length };
  }

  async getFolderCards(directoryId: string, ownerId: string): Promise<DueCardsResponse> {
    const directory = await this.contentRepository.findById(directoryId);
    if (!directory || directory.ownerId !== ownerId || directory.deleted) {
      throw new NotFoundException(`Directory ${directoryId} not found`);
    }
    if (directory.type !== 'directory') {
      throw new BadRequestException(`Content ${directoryId} is not a directory`);
    }

    const descendantIds = await this.contentRepository.findAllDescendantIds(directoryId, ownerId);
    const directoryIds = [directoryId, ...descendantIds];

    const decks = await this.contentRepository.findDecksByDirectoryIds(directoryIds, ownerId);

    const allCards: StudyCard[] = [];
    for (const deck of decks) {
      const noteId = deck.parentId ?? 'unknown';
      const cards = await this.cardRepository.findByDeckId(deck.id);
      const cardIds = cards.map(c => c.id);
      const results = await this.studyResultRepository.findByUserAndCardIds(ownerId, cardIds);
      const resultMap = new Map(results.map(r => [r.cardId, r]));

      for (const card of cards) {
        const result = resultMap.get(card.id);
        allCards.push({
          id: card.id,
          front: card.front,
          back: card.back,
          dueDate: result?.dueDate ?? new Date(0),
          interval: result?.interval ?? 0,
          repetitions: result?.repetitions ?? 0,
          deckId: deck.id,
          deckName: deck.name,
          noteId,
        });
      }
    }

    return { cards: allCards, totalDue: allCards.length };
  }

  async recordStudyResult(
    deckId: string,
    cardId: string,
    ownerId: string,
    result: 'know' | 'dont_know'
  ): Promise<{ card: Card; studyResult: StudyResult }> {
    const deck = await this.contentRepository.findById(deckId);
    if (!deck || deck.ownerId !== ownerId || deck.deleted) {
      throw new NotFoundException(`Deck ${deckId} not found`);
    }

    const card = await this.cardRepository.findById(cardId);
    if (!card || card.deleted || card.deckId !== deckId) {
      throw new NotFoundException(`Card ${cardId} not found`);
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
      studyResult: {
        ...studyResult,
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

  async countDueCards(deckId: string, userId: string): Promise<number> {
    const cards = await this.cardRepository.findByDeckId(deckId);
    if (cards.length === 0) return 0;

    const cardIds = cards.map(c => c.id);
    const dueResults = await this.studyResultRepository.findDueResults(userId, cardIds);
    return dueResults.length;
  }
}
