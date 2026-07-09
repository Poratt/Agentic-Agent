import { ApiProperty } from '@nestjs/swagger';
import { DatabaseTableStorageDto } from './database-table-storage.dto';

export class DatabaseStorageSummaryDto {
  @ApiProperty({ description: 'Database name.', example: 'agentic_admin' })
  databaseName!: string;

  @ApiProperty({ description: 'Total number of tables.', example: 12 })
  tableCount!: number;

  @ApiProperty({ description: 'Total row count across all tables.', example: 5420 })
  totalRows!: number;

  @ApiProperty({ description: 'Total database size in bytes.', example: 1048576 })
  totalSizeBytes!: number;

  @ApiProperty({ description: 'Human-readable total size.', example: '1 MB' })
  totalSizeFormatted!: string;

  @ApiProperty({ description: 'Name of the largest table.', example: 'chat_messages' })
  largestTableName!: string | null;

  @ApiProperty({ description: 'Per-table storage details, sorted by size descending.', type: [DatabaseTableStorageDto] })
  tables!: DatabaseTableStorageDto[];
}
