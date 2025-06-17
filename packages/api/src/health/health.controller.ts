import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

export class HealthResponseDto {
  status: string;
  timestamp: string;
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
      },
    },
  })
  getHealth(): HealthResponseDto {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
