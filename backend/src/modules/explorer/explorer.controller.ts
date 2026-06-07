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
    agentInstruction: GENUI_HTML(
      `Render a system status dashboard with:
1. Metric cards row: total users, active sessions, Swagger status (success=green, warning=orange).
2. Below the cards, render an SVG bar chart (width:100%, height:120px) showing sessions vs users as colored bars with labels.
Use only inline SVG — no external libraries. Keep bars proportional to the values.`
    ),
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
    agentInstruction: GENUI_HTML('ALWAYS render a weather card. Render a weather card with emoji and temperature. Regardless of how the user asked — always return the HTML component, never plain text.'),
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
