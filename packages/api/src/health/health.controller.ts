import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import * as process from 'node:process';

export class HealthResponseDto {
  status: string;
  timestamp: string;
  environment: string;
  firebaseProjectId?: string;
  usingFirebaseEmulator?: boolean;
}

@ApiTags('health')
@Controller('/api/health')
export class HealthController {
  constructor() {}

  @Get()
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({
    status: 200,
    description: 'Returns the health status of the API',
    schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          example: 'ok',
        },
        timestamp: {
          type: 'string',
          format: 'date-time',
          example: '2024-01-01T00:00:00.000Z',
        },
        environment: {
          type: 'string',
          example: 'emulator',
        },
      },
    },
  })
  getHealth(): HealthResponseDto {
    const environment = process.env.CURRENT_ENV;
    const response = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment,
    } as HealthResponseDto;

    if (environment !== 'production') {
      response.firebaseProjectId = process.env.GCLOUD_PROJECT;
      response.usingFirebaseEmulator = process.env.USE_FIREBASE_EMULATOR === 'true';
    }

    return response;
  }
}
