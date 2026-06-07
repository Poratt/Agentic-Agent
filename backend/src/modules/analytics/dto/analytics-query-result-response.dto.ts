import { ApiProperty } from '@nestjs/swagger';
import { AnalyticsQueryResponseDto } from './analytics-query-response.dto';

export class AnalyticsQueryResultResponseDto {
  @ApiProperty({ description: 'Whether the request succeeded.', example: true })
  success!: boolean;

  @ApiProperty({ description: 'Human-readable result message.', example: 'Analytics query completed successfully' })
  message!: string;

  @ApiProperty({ description: 'Analytics query result payload.', type: AnalyticsQueryResponseDto })
  result!: AnalyticsQueryResponseDto;
}

