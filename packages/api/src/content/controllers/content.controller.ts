import {
  Controller,
  Get,
  Request,
  Logger,
  Post,
  Body,
  Patch,
  Param,
  Put,
  Headers,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiUnauthorizedResponse,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
  ApiUnprocessableEntityResponse,
  ApiParam,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { apiProblemDetailsSchema } from '../../common/dto/problem-details.dto';
import { Auth } from '../../auth';
import { AuthenticatedRequest } from '../../auth';
import { RootDirectoryService } from '../services/root-directory.service';
import { Content } from '../entities/content.entity';
import { ContentService } from '../services/content.service';
import {
  ContentDto,
  ContentBodySignedUrlDto,
  CreateContentDto,
  UpdateContentNameDto,
} from '../dto/content.dto';

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
    summary: 'Create content (note)',
    description:
      'Creates leaf content under the given parent. MVP only creates items of type `note`; ' +
      'other kinds may reuse or extend this contract later.',
  })
  @ApiCreatedResponse({
    description: 'Content (metadata) created successfully.',
    type: ContentDto,
  })
  @ApiConflictResponse({
    description: 'Content with the same name already exists in the target location.',
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
      `Creating content for user: ${user.uid} with name: ${name} and parentId: ${parentId}`
    );
    return this.contentService.create(name, parentId, user.uid);
  }

  @Patch(':id')
  @Auth()
  @ApiOperation({
    summary: 'Rename content',
    description:
      'Updates the display name of the content. Names must be unique among siblings (same parent).',
  })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'The ID of the content.',
    type: String,
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
    description: 'Other content in this location already uses that name.',
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
   *  add support for other fields on the metadata record. Content body uploads stay on `PUT …/body`; if new binary
   *  flows appear, consider whether they belong here or on a dedicated surface.
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

  @Get(':id/children')
  @Auth()
  @ApiOperation({
    summary: "List a parent's children",
    description:
      'Returns child content (metadata only) for the given parent ID. Does not load content bodies.',
  })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'The ID of the parent content.',
    type: String,
  })
  @ApiOkResponse({
    description: 'Child content (metadata) returned successfully.',
    type: [ContentDto],
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Valid Firebase ID token required',
    ...apiProblemDetailsSchema,
  })
  async listContents(
    @Request() request: AuthenticatedRequest,
    @Param('id') id: string
  ): Promise<Content[]> {
    const { user } = request;
    this.logger.debug(`Getting content for user: ${user.uid} with parent content ID: ${id}`);

    // uncomment to test the loading indicator
    // await new Promise(resolve => setTimeout(resolve, 1000));

    return this.contentService.findByParentIdAndOwnerId(id, request.user.uid);
  }

  @Get(':id/body')
  @Auth()
  @ApiOperation({
    summary: 'Get signed URL to read content body',
    description:
      'Returns a short-lived signed URL for downloading the content body from Cloud Storage (valid 10 minutes). ' +
      '404 when the content has no content body yet (client may treat as empty). `GET /:id` returns metadata only and never includes body bytes.',
  })
  @ApiParam({
    name: 'id',
    required: true,
    description:
      'The ID of the content whose content body is read (leaf types such as a note in MVP).',
    type: String,
  })
  @ApiOkResponse({
    description: 'Signed URL and expiry.',
    type: ContentBodySignedUrlDto,
  })
  @ApiNotFoundResponse({
    description:
      'Content not found, no content body yet, or wrong type (see operation description).',
    ...apiProblemDetailsSchema,
  })
  @ApiForbiddenResponse({
    description: 'Authenticated user does not own this content.',
    ...apiProblemDetailsSchema,
  })
  @ApiBadRequestResponse({
    description: 'Body storage is not applicable (e.g. directory).',
    ...apiProblemDetailsSchema,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Valid Firebase ID token required',
    ...apiProblemDetailsSchema,
  })
  async getContentBodySignedUrl(
    @Request() request: AuthenticatedRequest,
    @Param('id') id: string
  ): Promise<ContentBodySignedUrlDto> {
    const { user } = request;
    this.logger.debug(`Getting body signed URL for content ${id}, user ${user.uid}`);
    return this.contentService.getContentBodySignedUrl(id, user.uid);
  }

  @Put(':id/body')
  @Auth()
  @ApiConsumes('application/octet-stream', 'text/plain', 'text/markdown', 'image/png', 'image/jpeg')
  @ApiBody({
    description:
      'Raw bytes of the content body. The `Content-Type` header sets the stored media type (e.g. markdown as `text/plain` or `text/markdown`, images as `image/*`). ' +
      'Omitting `Content-Type` defaults to `application/octet-stream`. `multipart/*` is rejected (415) until explicitly supported.',
    schema: { type: 'string', format: 'binary' },
  })
  @ApiOperation({
    summary: 'Upload or replace content body',
    description:
      'Single endpoint for any raw body type the client declares via `Content-Type`. Updates Cloud Storage object metadata and Firestore (`bodyUri`, `size`, `bodyMimeType`).',
  })
  @ApiParam({
    name: 'id',
    required: true,
    description:
      'The ID of the content whose content body is replaced (leaf types such as a note in MVP).',
    type: String,
  })
  @ApiOkResponse({
    description: 'Updated content metadata (no inline content body).',
    type: ContentDto,
  })
  @ApiNotFoundResponse({
    description: 'Content not found.',
    ...apiProblemDetailsSchema,
  })
  @ApiForbiddenResponse({
    description: 'Authenticated user does not own this content.',
    ...apiProblemDetailsSchema,
  })
  @ApiBadRequestResponse({
    description: 'Body storage is not applicable (e.g. directory) or malformed request.',
    ...apiProblemDetailsSchema,
  })
  @ApiResponse({
    status: 415,
    description: 'Unsupported media type (e.g. multipart body on this route).',
    ...apiProblemDetailsSchema,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Valid Firebase ID token required',
    ...apiProblemDetailsSchema,
  })
  async putContentBody(
    @Request() request: AuthenticatedRequest & { body: unknown },
    @Param('id') id: string,
    @Headers('content-type') contentType?: string
  ): Promise<Content> {
    const { user } = request;
    const buffer = this.readRawPutBody(request.body);
    this.logger.debug(`Putting body for content ${id}, user ${user.uid} (${buffer.length} bytes)`);
    return this.contentService.putContentBody(id, user.uid, buffer, contentType);
  }

  private readRawPutBody(body: unknown): Buffer {
    if (Buffer.isBuffer(body)) {
      return body;
    }
    if (typeof body === 'string') {
      return Buffer.from(body, 'utf8');
    }
    if (body === undefined || body === null) {
      return Buffer.alloc(0);
    }
    throw new BadRequestException('Request body must be raw bytes for this endpoint');
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

  @Get(':id')
  @Auth()
  @ApiOperation({
    summary: 'Get content by ID',
    description:
      'Returns Firestore metadata for the content (e.g. directory or note). Does not include the content body; use `GET …/body` for a signed read URL.',
  })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'The ID of the content.',
    type: String,
  })
  @ApiOkResponse({
    description: 'Content (metadata) found.',
    type: ContentDto,
  })
  @ApiNotFoundResponse({
    description:
      'Content not found, or the authenticated user does not own it (same response to avoid leaking ids).',
    ...apiProblemDetailsSchema,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Valid Firebase ID token required',
    ...apiProblemDetailsSchema,
  })
  async getContentById(
    @Request() request: AuthenticatedRequest,
    @Param('id') id: string
  ): Promise<Content> {
    const { user } = request;
    this.logger.debug(`Getting content ${id} for user: ${user.uid}`);
    return this.contentService.findByIdAndOwnerId(id, user.uid);
  }
}
