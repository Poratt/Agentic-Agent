import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { GENUI_HTML } from '../admin-agent/constants/gen-ui-spec.constant';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { CustomApiOperationOptions } from '../../core/types/custom-api-operation-options.type';
import { SystemService } from './system.service';

@ApiTags('system')
@ApiBearerAuth()
@Controller('system')
export class SystemController {
  constructor(private readonly systemService: SystemService) { }

  @Get('status')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Get system status and metrics',
    summaryHe: 'שולף את מצב המערכת הכללי ומדדי הפעילות',
    toolIcon: 'ph-gauge',
    description: 'Returns activity metrics and current runtime status parameters.',
    genUiSpec: GENUI_HTML(
      `Render a system status dashboard with:
1. Metric cards row: total users, active sessions, Swagger status (success=green, warning=orange).
2. Below the cards, render an SVG bar chart (width:100%, height:120px) showing sessions vs users as colored bars.
Use only inline SVG - no external libraries. Keep bars proportional to the values.`,
    ),
  } as CustomApiOperationOptions)
  @ApiOkResponse({
    description: 'System status metrics payload retrieved successfully.',
  })
  @ApiUnauthorizedResponse({ description: 'Missing or expired JWT token.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected server error.' })
  getStatus() {
    return this.systemService.getSystemStatus();
  }
}
