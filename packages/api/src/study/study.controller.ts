import { Controller, Get, Request, Logger, Query, BadRequestException } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiUnauthorizedResponse,
  ApiBadRequestResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { apiProblemDetailsSchema } from '../common/dto/problem-details.dto';
import { Auth } from '../auth';
import { AuthenticatedRequest } from '../auth';
import { StudyService } from './study.service';

@ApiTags('study')
@Controller('/api/study')
export class StudyController {
  private readonly logger = new Logger(StudyController.name);

  constructor(private readonly studyService: StudyService) {}

  @Get('due-cards')
  @Auth()
  @ApiOperation({
    summary: 'Get due cards for content roots',
    description:
      'Returns all due cards (dueDate <= now) from decks under the given content roots. ' +
      'Cards are ordered by dueDate ascending (oldest due first).',
  })
  @ApiQuery({
    name: 'rootIds',
    required: true,
    type: String,
    description: 'Comma-separated content root IDs',
    example: 'id1,id2',
  })
  @ApiOkResponse({
    description: 'Due cards returned successfully.',
    schema: {
      type: 'object',
      properties: {
        cards: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              front: { type: 'string' },
              back: { type: 'string' },
              dueDate: { type: 'string', format: 'date-time' },
              interval: { type: 'number' },
              repetitions: { type: 'number' },
              deckId: { type: 'string' },
              deckName: { type: 'string' },
              noteId: { type: 'string' },
            },
          },
        },
        totalDue: { type: 'number' },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Missing or invalid rootIds parameter.',
    ...apiProblemDetailsSchema,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Valid Firebase ID token required',
    ...apiProblemDetailsSchema,
  })
  async getDueCards(
    @Request() request: AuthenticatedRequest,
    @Query('rootIds') rootIdsParam: string
  ) {
    const { user } = request;

    if (!rootIdsParam || rootIdsParam.trim().length === 0) {
      throw new BadRequestException(
        'Query parameter `rootIds` is required (comma-separated content root IDs)'
      );
    }

    const rootIds = rootIdsParam
      .split(',')
      .map(id => id.trim())
      .filter(id => id.length > 0);

    if (rootIds.length === 0) {
      throw new BadRequestException('At least one content root ID is required');
    }

    this.logger.debug(`Getting due cards for user ${user.uid}, roots: ${rootIds.join(',')}`);

    return this.studyService.getDueCards(rootIds, user.uid);
  }
}
