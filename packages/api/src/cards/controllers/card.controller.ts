import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Request,
  Logger,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
  ApiBadRequestResponse,
  ApiParam,
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';
import { apiProblemDetailsSchema } from '../../common/dto/problem-details.dto';
import { IsOptional, IsString } from 'class-validator';
import { Auth } from '../../auth';
import { AuthenticatedRequest } from '../../auth';
import { Card } from '../entities/card.entity';
import { CardService } from '../services/card.service';

/**
 * Card Response DTO
 *
 * Public HTTP shape for a flashcard, intentionally separate
 * from the domain entity so the wire contract can evolve independently.
 */
export class CardResponse {
  @ApiProperty({
    description: 'Unique identifier for the card',
    example: 'clq0e8k1j0000c8v9a1b2c3d4',
  })
  id: string;

  @ApiProperty({
    description: 'ID of the deck this card belongs to',
    example: 'clq0e8k1j0000c8v9a1b2c3d4',
  })
  deckId: string;

  @ApiProperty({
    description: 'ID of the user who owns this card',
    example: 'firebase-user-id',
  })
  ownerId: string;

  @ApiProperty({
    description: 'Front side of the flashcard (question / prompt)',
    example: 'What is the capital of France?',
  })
  front: string;

  @ApiProperty({
    description: 'Back side of the flashcard (answer)',
    example: 'Paris',
  })
  back: string;

  @ApiProperty({
    description: 'Next due date for review',
    type: 'string',
    format: 'date-time',
  })
  dueDate: Date;

  @ApiProperty({
    description: 'Current interval in days between reviews (FSRS-compatible)',
    example: 1,
  })
  interval: number;

  @ApiProperty({
    description: 'Number of consecutive times the card was recalled correctly',
    example: 0,
  })
  repetitions: number;

  @ApiPropertyOptional({
    description: 'Result of the last study session',
    enum: ['know', 'dont_know'],
    nullable: true,
    example: null,
  })
  lastResult: 'know' | 'dont_know' | null;

  @ApiPropertyOptional({
    description: 'Timestamp of the last study session',
    type: 'string',
    format: 'date-time',
    nullable: true,
    example: null,
  })
  lastStudied: Date | null;

  @ApiProperty({
    description: 'Total number of times the card was answered correctly',
    example: 0,
  })
  correctCount: number;

  @ApiProperty({
    description: 'Total number of times the card was answered incorrectly',
    example: 0,
  })
  incorrectCount: number;

  @ApiPropertyOptional({
    description: 'Soft-delete flag',
    example: false,
    nullable: true,
  })
  deleted?: boolean;

  @ApiPropertyOptional({
    description: 'Soft-delete timestamp',
    type: 'string',
    format: 'date-time',
    nullable: true,
    example: null,
  })
  deletedAt?: Date | null;

  @ApiProperty({
    description: 'Timestamp when the card was created',
    type: 'string',
    format: 'date-time',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Timestamp when the card was last updated',
    type: 'string',
    format: 'date-time',
  })
  updatedAt: Date;
}

/**
 * Map a domain Card to the HTTP CardResponse shape.
 */
export function toCardResponse(card: Card): CardResponse {
  const response = new CardResponse();
  response.id = card.id;
  response.deckId = card.deckId;
  response.ownerId = card.ownerId;
  response.front = card.front;
  response.back = card.back;
  response.dueDate = card.dueDate;
  response.interval = card.interval;
  response.repetitions = card.repetitions;
  response.lastResult = card.lastResult;
  response.lastStudied = card.lastStudied;
  response.correctCount = card.correctCount;
  response.incorrectCount = card.incorrectCount;
  response.deleted = card.deleted;
  response.deletedAt = card.deletedAt ?? null;
  response.createdAt = card.createdAt;
  response.updatedAt = card.updatedAt;
  return response;
}

/** HTTP command body for `POST /api/content/:deckId/cards`. */
export class CreateCardRequest {
  @ApiProperty({
    description: 'Front side of the flashcard (question / prompt)',
    example: 'What is the capital of France?',
  })
  @IsString()
  front: string;

  @ApiProperty({
    description: 'Back side of the flashcard (answer)',
    example: 'Paris',
  })
  @IsString()
  back: string;
}

/** HTTP command body for `PATCH /api/content/:deckId/cards/:cardId`. */
export class UpdateCardRequest {
  @ApiPropertyOptional({
    description: 'Front side of the flashcard (question / prompt)',
    example: 'What is the capital of France?',
  })
  @IsOptional()
  @IsString()
  front?: string;

  @ApiPropertyOptional({
    description: 'Back side of the flashcard (answer)',
    example: 'Paris',
  })
  @IsOptional()
  @IsString()
  back?: string;
}

/**
 * Card Controller
 *
 * Handles CRUD operations for flashcards within a deck.
 * All endpoints require authentication and verify ownership.
 */
@ApiTags('cards')
@Controller('/api/content')
export class CardController {
  private readonly logger = new Logger(CardController.name);

  constructor(private readonly cardService: CardService) {}

  @Post(':deckId/cards')
  @Auth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a flashcard',
    description: 'Creates a new flashcard in the specified deck.',
  })
  @ApiParam({
    name: 'deckId',
    required: true,
    description: 'The ID of the deck to add the card to.',
    type: String,
  })
  @ApiCreatedResponse({
    description: 'Card created successfully.',
    type: CardResponse,
  })
  @ApiNotFoundResponse({
    description: 'Deck not found, or the authenticated user does not own it.',
    ...apiProblemDetailsSchema,
  })
  @ApiBadRequestResponse({
    description: 'Malformed request body or parameters.',
    ...apiProblemDetailsSchema,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Valid Firebase ID token required',
    ...apiProblemDetailsSchema,
  })
  async createCard(
    @Request() request: AuthenticatedRequest,
    @Param('deckId') deckId: string,
    @Body() body: CreateCardRequest
  ): Promise<CardResponse> {
    const { user } = request;
    this.logger.debug(`Creating card for user: ${user.uid} in deck: ${deckId}`);
    const card = await this.cardService.createCard(deckId, user.uid, body.front, body.back);
    return toCardResponse(card);
  }

  @Get(':deckId/cards')
  @Auth()
  @ApiOperation({
    summary: 'List all flashcards in a deck',
    description: 'Returns all cards belonging to the specified deck.',
  })
  @ApiParam({
    name: 'deckId',
    required: true,
    description: 'The ID of the deck whose cards to list.',
    type: String,
  })
  @ApiOkResponse({
    description: 'Cards retrieved successfully.',
    type: [CardResponse],
  })
  @ApiNotFoundResponse({
    description: 'Deck not found, or the authenticated user does not own it.',
    ...apiProblemDetailsSchema,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Valid Firebase ID token required',
    ...apiProblemDetailsSchema,
  })
  async getCards(
    @Request() request: AuthenticatedRequest,
    @Param('deckId') deckId: string
  ): Promise<CardResponse[]> {
    const { user } = request;
    this.logger.debug(`Fetching cards for user: ${user.uid} from deck: ${deckId}`);
    const cards = await this.cardService.getCards(deckId, user.uid);
    return cards.map(toCardResponse);
  }

  @Patch(':deckId/cards/:cardId')
  @Auth()
  @ApiOperation({
    summary: 'Update a flashcard',
    description:
      'Partially updates a flashcard. At least one of `front` or `back` must be provided.',
  })
  @ApiParam({
    name: 'deckId',
    required: true,
    description: 'The ID of the deck containing the card.',
    type: String,
  })
  @ApiParam({
    name: 'cardId',
    required: true,
    description: 'The ID of the card to update.',
    type: String,
  })
  @ApiOkResponse({
    description: 'Card updated successfully.',
    type: CardResponse,
  })
  @ApiNotFoundResponse({
    description: 'Card or deck not found, or the authenticated user does not own it.',
    ...apiProblemDetailsSchema,
  })
  @ApiBadRequestResponse({
    description: 'Malformed request body or parameters.',
    ...apiProblemDetailsSchema,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Valid Firebase ID token required',
    ...apiProblemDetailsSchema,
  })
  async updateCard(
    @Request() request: AuthenticatedRequest,
    @Param('deckId') deckId: string,
    @Param('cardId') cardId: string,
    @Body() body: UpdateCardRequest
  ): Promise<CardResponse> {
    const { user } = request;

    if (body.front === undefined && body.back === undefined) {
      throw new BadRequestException('Request body must include at least one of `front` or `back`.');
    }

    this.logger.debug(`Updating card ${cardId} in deck ${deckId} for user: ${user.uid}`);
    const card = await this.cardService.updateCard(deckId, cardId, user.uid, body.front, body.back);
    return toCardResponse(card);
  }

  @Delete(':deckId/cards/:cardId')
  @Auth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a flashcard',
    description: 'Deletes a flashcard from the specified deck.',
  })
  @ApiParam({
    name: 'deckId',
    required: true,
    description: 'The ID of the deck containing the card.',
    type: String,
  })
  @ApiParam({
    name: 'cardId',
    required: true,
    description: 'The ID of the card to delete.',
    type: String,
  })
  @ApiNoContentResponse({
    description: 'Card deleted successfully.',
  })
  @ApiNotFoundResponse({
    description: 'Card or deck not found, or the authenticated user does not own it.',
    ...apiProblemDetailsSchema,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Valid Firebase ID token required',
    ...apiProblemDetailsSchema,
  })
  async deleteCard(
    @Request() request: AuthenticatedRequest,
    @Param('deckId') deckId: string,
    @Param('cardId') cardId: string
  ): Promise<void> {
    const { user } = request;
    this.logger.debug(`Deleting card ${cardId} from deck ${deckId} for user: ${user.uid}`);
    await this.cardService.deleteCard(deckId, cardId, user.uid);
  }
}
