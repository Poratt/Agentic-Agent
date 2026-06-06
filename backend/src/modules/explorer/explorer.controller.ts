// FILE: src/modules/explorer/explorer.controller.ts

import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { CustomApiOperationOptions } from '../../core/types/custom-api-operation-options.type';
import { ExplorerService } from './explorer.service';
import { WeatherQueryDto } from './dto/weather-query.dto';
import { GENUI_HTML } from '../admin-agent/constants/agent-instructions.constant';

@ApiTags('explorer')
@ApiBearerAuth()
@Controller('explorer')
export class ExplorerController {
  constructor(private readonly explorerService: ExplorerService) { }

  @Get('status')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Get Explorer module status and system metrics',
    summaryHe: 'שולף את מצב המערכת הכללי ומדדי הפעילות',
    toolIcon: 'ph-gauge',
    description: 'Returns activity metrics and current runtime status parameters.',
  } as CustomApiOperationOptions)
  @ApiOkResponse({
    description: 'System status metrics payload retrieved successfully.',
  })
  @ApiUnauthorizedResponse({ description: 'Missing or expired JWT token.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected server error.' })
  getStatus() {
    return this.explorerService.getSystemStatus();
  }

  @Get('weather')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Get current weather for a location',
    summaryHe: 'בודק את מזג האוויר הנוכחי במיקום או עיר מסוימת בעולם',
    toolIcon: 'ph-cloud-sun',
    description: 'Queries an external weather service to retrieve dynamic real-time conditions.',
    agentInstruction: GENUI_HTML('Render a weather card with emoji and temperature.'),
  } as CustomApiOperationOptions)
  @ApiOkResponse({
    description: 'Weather data retrieved successfully.',
  })
  @ApiUnauthorizedResponse({ description: 'Missing or expired JWT token.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected server error.' })
  getWeather(@Query() query: WeatherQueryDto) {
    return this.explorerService.getWeather(query.city);
  }
}
