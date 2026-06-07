import { ApiProperty } from '@nestjs/swagger';
import { IsDateString } from 'class-validator';

export class AnalyticsDateRangeDto {
  @ApiProperty({
    description: 'Inclusive start date for the analytics query.',
    example: '2026-06-01',
  })
  @IsDateString()
  from!: string;

  @ApiProperty({
    description: 'Inclusive end date for the analytics query.',
    example: '2026-06-30',
  })
  @IsDateString()
  to!: string;
}

