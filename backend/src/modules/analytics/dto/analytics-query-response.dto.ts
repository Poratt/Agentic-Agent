import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AnalyticsChartType } from './analytics-chart-type.enum';
import { AnalyticsSeriesPointDto } from './analytics-series-point.dto';

export class AnalyticsQueryResponseDto {
  @ApiProperty({ description: 'Human-readable chart title.', example: 'User signups over time' })
  title!: string;

  @ApiProperty({
    description: 'Recommended chart type. 1 = bar, 2 = line, 3 = pie.',
    enum: AnalyticsChartType,
    enumName: 'AnalyticsChartType',
    example: AnalyticsChartType.Line,
  })
  chartType!: AnalyticsChartType;

  @ApiPropertyOptional({ description: 'Optional x-axis label.', example: 'Date' })
  xAxisLabel?: string;

  @ApiPropertyOptional({ description: 'Optional y-axis label.', example: 'Users' })
  yAxisLabel?: string;

  @ApiProperty({
    description: 'Chart-ready data series.',
    type: [AnalyticsSeriesPointDto],
  })
  series!: AnalyticsSeriesPointDto[];

  @ApiProperty({
    description: 'Short text summary of the analytics result.',
    example: '12 users signed up in the selected range.',
  })
  summary!: string;
}

