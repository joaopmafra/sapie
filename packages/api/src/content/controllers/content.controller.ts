import { Controller, Get, Request, Logger, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiUnauthorizedResponse,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { Auth } from '../../auth';
import { AuthenticatedRequest } from '../../auth/auth.guard';
import { RootDirectoryService } from '../services/root-directory.service';
import { Content } from '../entities/content.entity';
import { ContentService } from '../services/content.service';
import { ContentDto } from '../dto/content.dto';

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
