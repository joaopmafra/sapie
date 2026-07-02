import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Query,
  Request,
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiUnauthorizedResponse,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiBadRequestResponse,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { Response } from 'express';
import { apiProblemDetailsSchema } from '../common/dto/problem-details.dto';
import { Auth } from '../auth';
import { AuthenticatedRequest } from '../auth';
import { SyncLockService, LockStatus } from './sync-lock.service';

@ApiTags('sync')
@Controller('/api/sync')
export class SyncController {
  private readonly logger = new Logger(SyncController.name);

  constructor(private readonly syncLockService: SyncLockService) {}

  @Post('lock')
  @Auth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Acquire sync lock',
    description:
      'Acquires a pessimistic lock for sync push operations. ' +
      'Returns 409 Conflict if a valid (non-expired) lock already exists. ' +
      'Automatically overwrites expired locks.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['instanceId'],
      properties: {
        instanceId: { type: 'string', description: 'Random UUID identifying this CLI instance' },
      },
    },
  })
  @ApiCreatedResponse({
    description: 'Lock acquired successfully.',
    schema: {
      type: 'object',
      properties: {
        ownerId: { type: 'string' },
        lockedAt: { type: 'string', format: 'date-time' },
        expiresAt: { type: 'string', format: 'date-time' },
        resourceIds: { type: 'array', items: { type: 'string' } },
        operation: { type: 'string' },
        instanceId: { type: 'string' },
        locked: { type: 'boolean' },
      },
    },
  })
  @ApiConflictResponse({
    description: 'Lock already held by another instance.',
    ...apiProblemDetailsSchema,
  })
  @ApiBadRequestResponse({ description: 'Missing instanceId.', ...apiProblemDetailsSchema })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Valid Firebase ID token required',
    ...apiProblemDetailsSchema,
  })
  async acquireLock(
    @Request() request: AuthenticatedRequest,
    @Body('instanceId') instanceId: string,
    @Res({ passthrough: false }) res: Response
  ) {
    const { user } = request;
    this.logger.debug(`Acquiring lock for user ${user.uid}, instance ${instanceId}`);

    const result = await this.syncLockService.acquireLock(user.uid, instanceId);

    if (result.acquired) {
      return res.status(HttpStatus.CREATED).json(result.lock);
    }

    return res.status(HttpStatus.CONFLICT).json({
      type: 'https://sapie.dev/errors/sync-lock-conflict',
      title: 'Sync Lock Conflict',
      status: HttpStatus.CONFLICT,
      detail: `A sync operation is already in progress (instance ${result.existingLock!.instanceId}).`,
      instanceId: result.existingLock!.instanceId,
      expiresAt: result.existingLock!.expiresAt,
    });
  }

  @Delete('lock')
  @Auth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Release sync lock',
    description:
      'Releases the sync lock. The instanceId must match the lock holder. ' +
      'Use ?force=true to force-release regardless of instance (for abort/cleanup).',
  })
  @ApiQuery({
    name: 'instanceId',
    required: false,
    type: String,
    description: 'The instance ID that acquired the lock. Required unless force=true.',
  })
  @ApiQuery({
    name: 'force',
    required: false,
    type: Boolean,
    description: 'Force-release the lock regardless of which instance holds it.',
  })
  @ApiNoContentResponse({ description: 'Lock released successfully.' })
  @ApiForbiddenResponse({
    description: 'Lock is held by a different instance (and force was not set).',
    ...apiProblemDetailsSchema,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Valid Firebase ID token required',
    ...apiProblemDetailsSchema,
  })
  async releaseLock(
    @Request() request: AuthenticatedRequest,
    @Query('instanceId') instanceId: string,
    @Query('force') force: string,
    @Res({ passthrough: false }) res: Response
  ): Promise<void> {
    const { user } = request;

    if (force === 'true') {
      this.logger.debug(`Force-releasing lock for user ${user.uid}`);
      await this.syncLockService.forceReleaseLock(user.uid);
      res.status(HttpStatus.NO_CONTENT).send();
      return;
    }

    this.logger.debug(`Releasing lock for user ${user.uid}, instance ${instanceId}`);
    const result = await this.syncLockService.releaseLock(user.uid, instanceId);

    if (result.mismatchedInstance) {
      res.status(HttpStatus.FORBIDDEN).json({
        type: 'https://sapie.dev/errors/sync-lock-mismatch',
        title: 'Sync Lock Mismatch',
        status: HttpStatus.FORBIDDEN,
        detail: `Lock is held by a different instance (${result.mismatchedInstance}).`,
        instanceId: result.mismatchedInstance,
      });
      return;
    }

    res.status(HttpStatus.NO_CONTENT).send();
  }

  @Get('lock')
  @Auth()
  @ApiOperation({
    summary: 'Check sync lock status',
    description:
      'Returns the current sync lock status. A lock is considered valid if it exists and has not expired.',
  })
  @ApiOkResponse({
    description: 'Lock status returned.',
    schema: {
      type: 'object',
      properties: {
        locked: { type: 'boolean' },
        lock: {
          nullable: true,
          type: 'object',
          properties: {
            ownerId: { type: 'string' },
            lockedAt: { type: 'string', format: 'date-time' },
            expiresAt: { type: 'string', format: 'date-time' },
            resourceIds: { type: 'array', items: { type: 'string' } },
            operation: { type: 'string' },
            instanceId: { type: 'string' },
            locked: { type: 'boolean' },
          },
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Valid Firebase ID token required',
    ...apiProblemDetailsSchema,
  })
  async checkLock(@Request() request: AuthenticatedRequest): Promise<LockStatus> {
    const { user } = request;
    this.logger.debug(`Checking lock for user ${user.uid}`);
    return this.syncLockService.checkLock(user.uid);
  }
}
