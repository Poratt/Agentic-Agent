import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ANALYTICS_CHART_AGENT_INSTRUCTION } from '../admin-agent/constants/gen-ui-spec.constant';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { CustomApiOperationOptions } from '../../core/types/custom-api-operation-options.type';
import { AnalyticsService } from './analytics.service';
import { AnalyticsQueryDto } from './dto/analytics-query.dto';
import { AnalyticsQueryResultResponseDto } from './dto/analytics-query-result-response.dto';

@ApiTags('analytics')
@ApiBearerAuth()
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) { }

  @Post('query')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Run a safe analytics query',
    summaryHe: 'מריץ שאילתת אנליטיקה בטוחה ומחזיר נתונים לגרף',
    toolIcon: 'ph-chart-line',
    description:
      'Runs a supported analytics metric from the server-side catalog and returns chart-ready data.',
    genUiSpec: ANALYTICS_CHART_AGENT_INSTRUCTION,
  } as CustomApiOperationOptions)
  @ApiBody({
    type: AnalyticsQueryDto,
    description:
      'Analytics query request. The metric must be one of the supported numeric enum values.',
  })
  @ApiOkResponse({
    description: 'Analytics query completed successfully.',
    type: AnalyticsQueryResultResponseDto,
  })
  @ApiBadRequestResponse({ description: 'DTO validation failed or the selected metric/grouping is unsupported.' })
  @ApiUnauthorizedResponse({ description: 'Missing or expired JWT token.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected server error.' })
  query(@Body() dto: AnalyticsQueryDto) {
    return this.analyticsService.query(dto);
  }
}
