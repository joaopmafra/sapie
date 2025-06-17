import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('app')
@Controller('/api')
export class AppController {
  constructor() {}

  @Get()
  @ApiOperation({ summary: 'Get API status' })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns the API name and status',
    schema: {
      type: 'string',
      example: 'Sapie API'
    }
  })
  getHello(): string {
    return 'Sapie API';
  }
}
