import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';
import { CustomApiOperationOptions } from './core/types/custom-api-operation-options.type';

@ApiTags('app')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({
    summary: 'Health check / hello world',
    summaryHe: 'בודק שה-API זמין ומחזיר תגובת תקינות בסיסית',
    description:
      'Simple endpoint to verify the API is reachable. Useful for uptime checks and local smoke tests.',
  } as CustomApiOperationOptions)
  @ApiResponse({ status: 200, description: 'OK (plain text string)' })
  getHello(): string {
    return this.appService.getHello();
  }
}
