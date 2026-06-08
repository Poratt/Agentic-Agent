import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';
import { CustomApiOperationOptions } from './core/types/custom-api-operation-options.type';

@ApiTags('app')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) { }


}
