import { ApiProperty } from '@nestjs/swagger';
import { DatabaseStorageSummaryDto } from './database-storage-summary.dto';

export class DatabaseStorageResultResponseDto {
  @ApiProperty({ description: 'Whether the request succeeded.', example: true })
  success!: boolean;

  @ApiProperty({ description: 'Human-readable result message.', example: 'Database storage summary retrieved successfully' })
  message!: string;

  @ApiProperty({ description: 'Storage summary payload.', type: DatabaseStorageSummaryDto })
  result!: DatabaseStorageSummaryDto;
}
