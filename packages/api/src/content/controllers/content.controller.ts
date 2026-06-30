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
  Delete,
  Headers,
  Header,
  HttpCode,
  HttpStatus,
  BadRequestException,
  StreamableFile,
  Query,
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
  ApiNoContentResponse,
  ApiBadRequestResponse,
  ApiUnprocessableEntityResponse,
  ApiParam,
  ApiConsumes,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { apiProblemDetailsSchema } from '../../common/dto/problem-details.dto';
import { Auth } from '../../auth';
import { AuthenticatedRequest } from '../../auth';
import { RootDirectoryService } from '../services/root-directory.service';
import { ContentService } from '../services/content.service';
import { ContentType } from '../entities/content.entity';
import {
  ContentBodyUrlResponse,
  ContentResponse,
  CreateContentRequest,
  toContentResponse,
  UpdateContentRequest,
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
    summary: 'Create content (note or folder)',
    description:
      'Creates metadata under the given parent. Default `type` is `note`. ' +
      'Send `type: directory` to create a folder (parent must be a folder).',
  })
  @ApiCreatedResponse({
    description: 'Content (metadata) created successfully.',
    type: ContentResponse,
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
    @Body() createContentRequest: CreateContentRequest
  ): Promise<ContentResponse> {
    const { user } = request;
    const { name, parentId, type } = createContentRequest;
    const contentType = type ?? ContentType.NOTE;
    this.logger.debug(
      `Creating content for user: ${user.uid} with name: ${name}, parentId: ${parentId}, type: ${contentType}`
    );
    const created = await this.contentService.create(name, parentId, user.uid, contentType);
    return toContentResponse(created);
  }

  @Patch(':id')
  @Auth()
  @ApiOperation({
    summary: 'Patch content metadata',
    description:
      'Partially updates content metadata. Today this supports renaming (`name`). ' +
      'Moving an item to another folder (`parentId`) will use the same route; that behavior is **not implemented yet** ' +
      'and returns `400 Bad Request` if `parentId` is sent. ' +
      'Body bytes and the nested `body` summary are changed only via `PUT …/body`. ' +
      'When renaming, names must stay unique among siblings under the same parent.',
  })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'The ID of the content.',
    type: String,
  })
  @ApiOkResponse({
    description: 'Content metadata updated successfully.',
    type: ContentResponse,
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
    description:
      'Malformed request body or parameters, empty patch body, reserved fields not yet supported (e.g. `parentId`), ' +
      'or rename requested without a `name` field.',
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
  async patchContent(
    @Request() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: UpdateContentRequest
  ): Promise<ContentResponse> {
    const { user } = request;

    if (body.parentId !== undefined) {
      throw new BadRequestException(
        'Moving content to another folder is not implemented yet; omit `parentId` from the request body.'
      );
    }

    if (body.name === undefined || body.name === null) {
      throw new BadRequestException(
        'Request body must include `name` until additional patch fields (such as `parentId`) are supported.'
      );
    }

    this.logger.debug(`Patching content ${id} for user: ${user.uid}`);
    const updated = await this.contentService.patchContent(id, body.name, user.uid);
    return toContentResponse(updated);
  }

  @Get(':id/children')
  @Auth()
  @ApiOperation({
    summary: "List a parent's children",
    description:
      'Returns child content (metadata only) for the given parent ID. ' +
      'Returns **folders and notes** for sidebar tree use. ' +
      'Does not load content bodies or signed read URLs.',
  })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'The ID of the parent content.',
    type: String,
  })
  @ApiOkResponse({
    description: 'Child content (metadata) returned successfully.',
    type: [ContentResponse],
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Valid Firebase ID token required',
    ...apiProblemDetailsSchema,
  })
  async listContents(
    @Request() request: AuthenticatedRequest,
    @Param('id') id: string
  ): Promise<ContentResponse[]> {
    const { user } = request;
    this.logger.debug(`Getting content for user: ${user.uid} with parent content ID: ${id}`);

    const children = await this.contentService.findByParentIdAndOwnerId(id, request.user.uid);
    return children.map(toContentResponse);
  }

  @Get(':id/body/signed-url')
  @Auth()
  @ApiOperation({
    summary: 'Get signed URL to read content body',
    description:
      'Returns a short-lived signed URL for downloading the content body from Cloud Storage (valid 10 minutes). ' +
      '404 when the content has no content body yet (client may treat as empty). `GET /:id` returns metadata only and never includes body bytes. ',
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
    type: ContentBodyUrlResponse,
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
  // TODO: Revisit inlining a signed read URL into `GET /:id` or `GET /:id/children` if we need fewer client round
  //  trips (trade-offs: signing volume, payload size, URL expiry vs metadata cache).
  @Header('Cache-Control', 'no-store, no-cache, must-revalidate')
  @Header('Pragma', 'no-cache')
  async getContentBodySignedUrl(
    @Request() request: AuthenticatedRequest,
    @Param('id') id: string
  ): Promise<ContentBodyUrlResponse> {
    const { user } = request;
    this.logger.debug(`Getting body signed URL for content ${id}, user ${user.uid}`);
    return this.contentService.getContentBodySignedUrl(id, user.uid);
  }

  @Get(':id/body')
  @Auth()
  @ApiOperation({
    summary: 'Stream content body bytes',
    description:
      'Authenticated read of stored body bytes (note markdown or image). Returns 200 with `Content-Type` from stored metadata. ' +
      '404 when the content has no body yet. No ETag / 304 in this release.',
  })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'The ID of the content whose body is read.',
    type: String,
  })
  @ApiOkResponse({
    description: 'Body bytes streamed successfully.',
    schema: { type: 'string', format: 'binary' },
  })
  @ApiNotFoundResponse({
    description: 'Content not found, no body yet, or storage object missing.',
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
  @Header('Cache-Control', 'private, no-cache')
  async getContentBody(
    @Request() request: AuthenticatedRequest,
    @Param('id') id: string
  ): Promise<StreamableFile> {
    const { user } = request;
    this.logger.debug(`Streaming body for content ${id}, user ${user.uid}`);
    const { stream, contentType } = await this.contentService.getContentBodyStream(id, user.uid);
    return new StreamableFile(stream, { type: contentType });
  }

  @Put(':id/body')
  @Auth()
  @ApiConsumes(
    'application/octet-stream',
    'text/plain',
    'text/markdown',
    'image/png',
    'image/jpeg',
    'image/webp'
  )
  @ApiBody({
    description:
      'Raw bytes of the content body. The `Content-Type` header sets the stored media type (e.g. markdown as `text/plain` or `text/markdown`, images as `image/*`). ' +
      'Omitting `Content-Type` defaults to `application/octet-stream`. `multipart/*` is rejected (415) until explicitly supported.',
    schema: { type: 'string', format: 'binary' },
  })
  @ApiOperation({
    summary: 'Upload or replace content body',
    description:
      'Single endpoint for note markdown body bytes. Updates Cloud Storage and nested Firestore `body` (incl. `body.updatedAt`). ' +
      '**Notes** require `expectedRevision` query parameter (`body.updatedAt` ISO string from metadata, or empty string before first save). ' +
      'Returns **409** when revision is stale.',
  })
  @ApiQuery({
    name: 'expectedRevision',
    required: false,
    type: String,
    description:
      'Required for notes. `body.updatedAt` ISO string at load/last save, or empty string when the note has no body yet.',
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
    type: ContentResponse,
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
    status: 413,
    description: 'Request body exceeds the configured maximum size.',
    ...apiProblemDetailsSchema,
  })
  @ApiResponse({
    status: 415,
    description: 'Unsupported media type (e.g. multipart body on this route).',
    ...apiProblemDetailsSchema,
  })
  @ApiConflictResponse({
    description: 'Note body revision mismatch (`expectedRevision` stale).',
    ...apiProblemDetailsSchema,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Valid Firebase ID token required',
    ...apiProblemDetailsSchema,
  })
  async putContentBody(
    @Request() request: AuthenticatedRequest & { body: unknown },
    @Param('id') id: string,
    @Headers('content-type') contentType?: string,
    @Query('expectedRevision') expectedRevision?: string
  ): Promise<ContentResponse> {
    const { user } = request;
    const buffer = this.readRawPutBody(request.body);
    this.logger.debug(`Putting body for content ${id}, user ${user.uid} (${buffer.length} bytes)`);
    const updated = await this.contentService.putContentBody(
      id,
      user.uid,
      buffer,
      contentType,
      expectedRevision
    );
    return toContentResponse(updated);
  }

  @Post(':contentId/blobs')
  @Auth()
  @ApiConsumes('image/png', 'image/jpeg', 'image/webp', 'image/gif', 'application/octet-stream')
  @ApiBody({
    description:
      'Raw bytes of the blob (inline image). The `Content-Type` header sets the stored media type.',
    schema: { type: 'string', format: 'binary' },
  })
  @ApiOperation({
    summary: 'Upload a blob (inline image) for a note',
    description:
      'Stores raw bytes as a blob under the note. Returns the generated blob ID and its read URL.',
  })
  @ApiParam({ name: 'contentId', required: true, type: String, description: 'Parent note ID' })
  @ApiCreatedResponse({
    description: 'Blob stored successfully.',
    schema: {
      type: 'object',
      properties: { blobId: { type: 'string' }, url: { type: 'string' } },
    },
  })
  @ApiNotFoundResponse({ description: 'Note not found.', ...apiProblemDetailsSchema })
  @ApiForbiddenResponse({ description: 'Not the note owner.', ...apiProblemDetailsSchema })
  @ApiBadRequestResponse({ description: 'Parent is not a note.', ...apiProblemDetailsSchema })
  @ApiResponse({ status: 413, description: 'Body exceeds size limit.', ...apiProblemDetailsSchema })
  @ApiResponse({
    status: 415,
    description: 'Multipart is not supported.',
    ...apiProblemDetailsSchema,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Valid Firebase ID token required',
    ...apiProblemDetailsSchema,
  })
  async postBlob(
    @Request() request: AuthenticatedRequest & { body: unknown },
    @Param('contentId') contentId: string,
    @Headers('content-type') contentType?: string
  ): Promise<{ blobId: string; url: string }> {
    const { user } = request;
    const buffer = this.readRawPutBody(request.body);
    this.logger.debug(
      `Uploading blob for content ${contentId}, user ${user.uid} (${buffer.length} bytes)`
    );
    return this.contentService.uploadBlob(contentId, user.uid, buffer, contentType);
  }

  @Get(':contentId/blobs/:blobId')
  @Auth()
  @ApiOperation({ summary: 'Stream blob bytes' })
  @ApiParam({ name: 'contentId', required: true, type: String, description: 'Parent note ID' })
  @ApiParam({ name: 'blobId', required: true, type: String, description: 'Blob ID' })
  @ApiOkResponse({
    description: 'Blob bytes streamed successfully.',
    schema: { type: 'string', format: 'binary' },
  })
  @ApiNotFoundResponse({ description: 'Note or blob not found.', ...apiProblemDetailsSchema })
  @ApiForbiddenResponse({ description: 'Not the note owner.', ...apiProblemDetailsSchema })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Valid Firebase ID token required',
    ...apiProblemDetailsSchema,
  })
  @Header('Cache-Control', 'private, max-age=31536000, immutable')
  async getBlob(
    @Request() request: AuthenticatedRequest,
    @Param('contentId') contentId: string,
    @Param('blobId') blobId: string
  ): Promise<StreamableFile> {
    const { user } = request;
    this.logger.debug(`Streaming blob ${blobId} for content ${contentId}, user ${user.uid}`);
    const { stream, contentType } = await this.contentService.getBlobStream(
      contentId,
      blobId,
      user.uid
    );
    return new StreamableFile(stream, { type: contentType });
  }

  @Delete(':id')
  @Auth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Soft-delete content (note or directory)',
    description:
      'Soft-deletes content by setting `deleted: true`. ' +
      'Notes with content children (e.g. flashcard decks) require `?cascade=true` to delete. ' +
      'Folders are always cascaded to all descendants. ' +
      'Cloud Storage objects (bodies and blobs) are NOT deleted — permanent cleanup is deferred.',
  })
  @ApiParam({ name: 'id', required: true, type: String })
  @ApiQuery({
    name: 'cascade',
    required: false,
    type: Boolean,
    description: 'Set to true to cascade-delete content children of a note.',
  })
  @ApiNoContentResponse({ description: 'Content soft-deleted successfully.' })
  @ApiNotFoundResponse({
    description: 'Content not found or already deleted.',
    ...apiProblemDetailsSchema,
  })
  @ApiForbiddenResponse({ description: 'Not the content owner.', ...apiProblemDetailsSchema })
  @ApiConflictResponse({
    description: 'Note has content children and cascade was not set.',
    ...apiProblemDetailsSchema,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Valid Firebase ID token required',
    ...apiProblemDetailsSchema,
  })
  async deleteContent(
    @Request() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Query('cascade') cascade?: string
  ): Promise<void> {
    const { user } = request;
    this.logger.debug(`Deleting content ${id} for user ${user.uid}, cascade=${cascade}`);
    await this.contentService.deleteContent(id, user.uid, cascade === 'true');
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
   * @returns Promise<ContentResponse> - The user's root directory
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
    type: ContentResponse,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Valid Firebase ID token required',
    ...apiProblemDetailsSchema,
  })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error - Failed to ensure root directory',
    ...apiProblemDetailsSchema,
  })
  async getRootDirectory(@Request() request: AuthenticatedRequest): Promise<ContentResponse> {
    const userId = request.user.uid;

    try {
      this.logger.debug(`Getting root directory for user: ${userId}`);
      const rootDirectory = await this.rootDirectoryService.ensureRootDirectory(userId);

      // uncomment to test the loading indicator
      //await new Promise(resolve => setTimeout(resolve, 1000));

      this.logger.debug(
        `Successfully retrieved root directory for user: ${userId}, directory ID: ${rootDirectory.id}`
      );
      return toContentResponse(rootDirectory);
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
      'Returns Firestore metadata for the content (e.g. directory or note). Does not include the content body; use `GET …/body/signed-url` for a signed read URL. ' +
      'Directory items omit `body`; notes include `body: null` until the first `PUT …/body`, then a public summary (no storage URI).',
  })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'The ID of the content.',
    type: String,
  })
  @ApiOkResponse({
    description: 'Content (metadata) found.',
    type: ContentResponse,
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
  ): Promise<ContentResponse> {
    const { user } = request;
    this.logger.debug(`Getting content ${id} for user: ${user.uid}`);
    const item = await this.contentService.findByIdAndOwnerId(id, user.uid);
    return toContentResponse(item);
  }
}
