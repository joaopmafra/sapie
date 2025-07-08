import { Controller, Get, Request, Logger, Query, Post, Body } from '@nestjs/common';
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
} from '@nestjs/swagger';
import { Auth } from '../../auth';
import { AuthenticatedRequest } from '../../auth/auth.guard';
import { RootDirectoryService } from '../services/root-directory.service';
import { Content } from '../entities/content.entity';
import { ContentService } from '../services/content.service';
import { ContentDto, CreateContentDto } from '../dto/content.dto';

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
    description: 'Creates a new note with a given title and parent ID.',
  })
  @ApiCreatedResponse({
    description: 'Note created successfully.',
    type: ContentDto,
  })
  @ApiConflictResponse({
    description: 'A note with the same name already exists in the target location.',
  })
  @ApiForbiddenResponse({
    description: 'User is not the owner of the parent folder.',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Valid Firebase ID token required',
  })
  async createContent(
    @Request() request: AuthenticatedRequest,
    @Body() createContentDto: CreateContentDto
  ): Promise<Content> {
    const { user } = request;
    const { title, parentId } = createContentDto;
    this.logger.debug(
      `Creating note for user: ${user.uid} with title: ${title} and parentId: ${parentId}`
    );
    return this.contentService.create(title, parentId, user.uid);
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
  })
  async getContent(
    @Request() request: AuthenticatedRequest,
    @Query('parentId') parentId: string
  ): Promise<Content[]> {
    const { user } = request;
    this.logger.debug(`Getting content for user: ${user.uid} with parentId: ${parentId}`);

    const rootDirectory = await this.rootDirectoryService.getRootDirectory(user.uid);

    if (rootDirectory && rootDirectory.id === parentId) {
      return this.contentService.findByParentId('root');
    }

    // uncomment to test the loading indicator
    // await new Promise(resolve => setTimeout(resolve, 1000));

    return this.contentService.findByParentId(parentId);
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
  })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error - Failed to ensure root directory',
  })
  async getRootDirectory(@Request() request: AuthenticatedRequest): Promise<Content> {
    const userId = request.user.uid;

    try {
      this.logger.debug(`Getting root directory for user: ${userId}`);

      const rootDirectory = await this.rootDirectoryService.ensureRootDirectory(userId);

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
