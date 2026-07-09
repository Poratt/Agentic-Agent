import { ApiProperty } from '@nestjs/swagger';

export class DatabaseTableStorageDto {
  @ApiProperty({ description: 'Table name.', example: 'users' })
  tableName!: string;

  @ApiProperty({ description: 'Approximate row count.', example: 1240 })
  rowCount!: number;

  @ApiProperty({ description: 'Data size in bytes.', example: 16384 })
  dataSizeBytes!: number;

  @ApiProperty({ description: 'Index size in bytes.', example: 8192 })
  indexSizeBytes!: number;

  @ApiProperty({ description: 'Total size in bytes (data + index).', example: 24576 })
  totalSizeBytes!: number;

  @ApiProperty({ description: 'Human-readable data size.', example: '16 KB' })
  dataSizeFormatted!: string;

  @ApiProperty({ description: 'Human-readable index size.', example: '8 KB' })
  indexSizeFormatted!: string;

  @ApiProperty({ description: 'Human-readable total size.', example: '24 KB' })
  totalSizeFormatted!: string;

  @ApiProperty({ description: 'Percentage of total database size.', example: 35.2 })
  percentOfDatabase!: number;
}
