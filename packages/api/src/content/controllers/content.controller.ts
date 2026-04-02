import { Controller, Get, Request, Logger, Query, Post, Body, Patch, Param } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiUnauthorizedResponse,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiQuery,
  ApiCreatedResponse,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { apiProblemDetailsSchema } from '../../common/dto/problem-details.dto';
import { Auth } from '../../auth';
import { AuthenticatedRequest } from '../../auth';
import { RootDirectoryService } from '../services/root-directory.service';
import { Content } from '../entities/content.entity';
import { ContentService } from '../services/content.service';
import { ContentDto, CreateContentDto, UpdateContentNameDto } from '../dto/content.dto';

/**
 * Content Controller
 *
 * This controller provides content-related endpoints including
 * root directory management and content operations.
 */
@ApiTags('content')
@Controller('/api/content')
export class ContentController {
  private readonly logger = new Logger(ContentController.name);

  constructor(
    private readonly rootDirectoryService: RootDirectoryService,
    private readonly contentService: ContentService
  ) {}

  @Post()
  @Auth()
  @ApiOperation({
    summary: 'Create a new note',
    description: 'Creates a new note with a given name and parent ID.',
  })
  @ApiCreatedResponse({
    description: 'Note created successfully.',
    type: ContentDto,
  })
  @ApiConflictResponse({
    description: 'A note with the same name already exists in the target location.',
    ...apiProblemDetailsSchema,
  })
  @ApiForbiddenResponse({
    description: 'User is not the owner of the parent folder.',
    ...apiProblemDetailsSchema,
  })
  @ApiBadRequestResponse({
    description: 'Malformed request body or parameters.',
    ...apiProblemDetailsSchema,
  })
  @ApiUnprocessableEntityResponse({
    description: 'Semantic validation failed (e.g. name length or disallowed characters).',
    ...apiProblemDetailsSchema,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Valid Firebase ID token required',
    ...apiProblemDetailsSchema,
  })
  async createContent(
    @Request() request: AuthenticatedRequest,
    @Body() createContentDto: CreateContentDto
  ): Promise<Content> {
    const { user } = request;
    const { name, parentId } = createContentDto;
    this.logger.debug(
      `Creating note for user: ${user.uid} with name: ${name} and parentId: ${parentId}`
    );
    return this.contentService.create(name, parentId, user.uid);
  }

  @Patch(':id')
  @Auth()
  @ApiOperation({
    summary: 'Rename content',
    description:
      'Updates the display name of a note or folder. Names must be unique among siblings (same parent).',
  })
  @ApiOkResponse({
    description: 'Content renamed successfully.',
    type: ContentDto,
  })
  @ApiNotFoundResponse({
    description:
      'Content not found, or the authenticated user does not own it (same response to avoid leaking ids).',
    ...apiProblemDetailsSchema,
  })
  @ApiConflictResponse({
    description: 'Another item with the same name already exists in this location.',
    ...apiProblemDetailsSchema,
  })
  @ApiBadRequestResponse({
    description: 'Malformed request body or parameters.',
    ...apiProblemDetailsSchema,
  })
  @ApiUnprocessableEntityResponse({
    description: 'Semantic validation failed (e.g. name length or disallowed characters).',
    ...apiProblemDetailsSchema,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Valid Firebase ID token required',
    ...apiProblemDetailsSchema,
  })
  /**
   * TODO: Currently this endpoint implements only content renaming. In the future it's likely that we will need to
   *  add support for other fields and content files (the content entity contains only metadata) as well. About the
   *  content files handling, maybe we should create a new controller for that.
   */
  async renameContent(
    @Request() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() updateContentNameDto: UpdateContentNameDto
  ): Promise<Content> {
    const { user } = request;
    this.logger.debug(`Renaming content ${id} for user: ${user.uid}`);
    return this.contentService.renameContent(id, updateContentNameDto.name, user.uid);
  }

  @Get()
  @Auth()
  @ApiOperation({
    summary: 'Get content by parent ID',
    description: 'Returns a list of content items for a given parent ID.',
  })
  @ApiQuery({
    name: 'parentId',
    required: true,
    description: 'The ID of the parent content item.',
    type: String,
  })
  @ApiOkResponse({
    description: 'Content retrieved successfully.',
    type: [ContentDto],
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Valid Firebase ID token required',
    ...apiProblemDetailsSchema,
  })
  async getContent(
    @Request() request: AuthenticatedRequest,
    @Query('parentId') parentId: string
  ): Promise<Content[]> {
    const { user } = request;
    this.logger.debug(`Getting content for user: ${user.uid} with parentId: ${parentId}`);

    // uncomment to test the loading indicator
    // await new Promise(resolve => setTimeout(resolve, 1000));

    return this.contentService.findByParentIdAndOwnerId(parentId, request.user.uid);
  }

  /**
   * Get or create user's root directory
   *
   * This endpoint ensures the authenticated user has a root directory
   * and returns it. If the directory doesn't exist, it will be created.
   *
   * @param request - HTTP request with authenticated user context
   * @returns Promise<Content> - The user's root directory
   */
  @Get('/root')
  @Auth()
  @ApiOperation({
    summary: "Get or create user's root directory",
    description:
      'Returns the authenticated user\'s root directory ("My Contents"). ' +
      "If the directory doesn't exist, it will be automatically created. " +
      'This is the entry point for all content management operations.',
  })
  @ApiResponse({
    status: 200,
    description: 'Root directory retrieved or created successfully',
    type: ContentDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Valid Firebase ID token required',
    ...apiProblemDetailsSchema,
  })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error - Failed to ensure root directory',
    ...apiProblemDetailsSchema,
  })
  async getRootDirectory(@Request() request: AuthenticatedRequest): Promise<Content> {
    const userId = request.user.uid;

    try {
      this.logger.debug(`Getting root directory for user: ${userId}`);
      const rootDirectory = await this.rootDirectoryService.ensureRootDirectory(userId);

      // uncomment to test the loading indicator
      //await new Promise(resolve => setTimeout(resolve, 1000));

      this.logger.debug(
        `Successfully retrieved root directory for user: ${userId}, directory ID: ${rootDirectory.id}`
      );
      return rootDirectory;
    } catch (error) {
      this.logger.error(`Failed to get root directory for user: ${userId}`, error);
      throw error;
    }
  }
}
