import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsOptional, ValidateNested } from 'class-validator';
import { AnalyticsDateRangeDto } from './analytics-date-range.dto';
import { AnalyticsGroupBy } from './analytics-group-by.enum';
import { AnalyticsMetric } from './analytics-metric.enum';

export class AnalyticsQueryDto {
  @ApiProperty({
    description:
      'Supported analytics metric to run. 1 = users by role, 2 = user signups over time, 3 = active sessions over time.',
    enum: AnalyticsMetric,
    enumName: 'AnalyticsMetric',
    example: AnalyticsMetric.UserSignupsOverTime,
  })
  @IsEnum(AnalyticsMetric)
  metric!: AnalyticsMetric;

  @ApiPropertyOptional({
    description: 'Optional date range. If omitted, the service applies the metric default.',
    type: AnalyticsDateRangeDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => AnalyticsDateRangeDto)
  range?: AnalyticsDateRangeDto;

  @ApiPropertyOptional({
    description: 'Optional grouping. Must be supported by the selected metric.',
    enum: AnalyticsGroupBy,
    enumName: 'AnalyticsGroupBy',
    example: AnalyticsGroupBy.Day,
  })
  @IsOptional()
  @IsEnum(AnalyticsGroupBy)
  groupBy?: AnalyticsGroupBy;
}

