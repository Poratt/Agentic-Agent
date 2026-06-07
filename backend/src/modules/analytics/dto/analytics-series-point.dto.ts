import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AnalyticsSeriesPointDto {
  @ApiProperty({ description: 'Display label for this data point.', example: '2026-06-01' })
  label!: string;

  @ApiProperty({ description: 'Numeric value for this data point.', example: 12 })
  value!: number;

  @ApiPropertyOptional({
    description: 'ISO date bucket represented by this point, when the metric is time based.',
    example: '2026-06-01',
  })
  date?: string;
}

