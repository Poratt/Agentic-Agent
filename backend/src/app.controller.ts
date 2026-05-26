import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('app')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({
    summary: 'Health check / hello world',
    description:
      'Simple endpoint to verify the API is reachable. Useful for uptime checks and local smoke tests.',
  })
  @ApiResponse({ status: 200, description: 'OK (plain text string)' })
  getHello(): string {
    return this.appService.getHello();
  }
}
