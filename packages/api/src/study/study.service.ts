import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { ContentRepository } from '../content/repositories/content-repository.service';
import { CardService } from '../cards/services/card.service';
import { ContentType } from '../content/entities/content.entity';

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
    private readonly cardService: CardService
  ) {}

  async getDueCards(rootIds: string[], ownerId: string): Promise<DueCardsResponse> {
    if (rootIds.length === 0) {
      return { cards: [], totalDue: 0 };
    }

    const allCards: StudyCard[] = [];

    for (const rootId of rootIds) {
      // Verify the root exists and is owned by the user
      const root = await this.contentRepository.findById(rootId);
      if (!root || root.ownerId !== ownerId || root.deleted) {
        throw new NotFoundException(`Content root ${rootId} not found`);
      }
      if (root.type !== ContentType.DIRECTORY) {
        throw new BadRequestException(`Content ${rootId} is not a folder`);
      }

      // Collect all descendant folder IDs + the root itself
      const descendantIds = await this.contentRepository.findAllDescendantIds(rootId, ownerId);
      const folderIds = [rootId, ...descendantIds];

      // Find all non-deleted decks under those folders
      const decks = await this.contentRepository.findDecksByFolderIds(folderIds, ownerId);

      // For each deck, get due cards and enrich with deck info
      for (const deck of decks) {
        const noteId = deck.parentId ?? 'unknown';

        const dueCards = await this.cardService.findDueCards(deck.id);
        for (const card of dueCards) {
          allCards.push({
            id: card.id,
            front: card.front,
            back: card.back,
            dueDate: card.dueDate,
            interval: card.interval,
            repetitions: card.repetitions,
            deckId: deck.id,
            deckName: deck.name,
            noteId,
          });
        }
      }
    }

    // Sort by dueDate ascending (oldest due first)
    allCards.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

    return {
      cards: allCards,
      totalDue: allCards.length,
    };
  }

  /**
   * Returns ALL cards (not just due) under a folder, for ungraded review.
   */
  async getFolderCards(folderId: string, ownerId: string): Promise<DueCardsResponse> {
    const folder = await this.contentRepository.findById(folderId);
    if (!folder || folder.ownerId !== ownerId || folder.deleted) {
      throw new NotFoundException(`Folder ${folderId} not found`);
    }
    if (folder.type !== ContentType.DIRECTORY) {
      throw new BadRequestException(`Content ${folderId} is not a folder`);
    }

    const descendantIds = await this.contentRepository.findAllDescendantIds(folderId, ownerId);
    const folderIds = [folderId, ...descendantIds];

    const decks = await this.contentRepository.findDecksByFolderIds(folderIds, ownerId);

    const allCards: StudyCard[] = [];
    for (const deck of decks) {
      const noteId = deck.parentId ?? 'unknown';
      const cards = await this.cardService.getCards(deck.id, ownerId);
      for (const card of cards) {
        allCards.push({
          id: card.id,
          front: card.front,
          back: card.back,
          dueDate: card.dueDate,
          interval: card.interval,
          repetitions: card.repetitions,
          deckId: deck.id,
          deckName: deck.name,
          noteId,
        });
      }
    }

    return { cards: allCards, totalDue: allCards.length };
  }
}
