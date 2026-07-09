import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ServiceResultContainer } from '../../core/models/service-result-container.model';
import { DatabaseStorageSummaryDto } from './dto/database-storage-summary.dto';
import { DatabaseTableStorageDto } from './dto/database-table-storage.dto';

interface RawTableInfo {
  tableName: string;
  rowCount: number | null;
  dataSizeBytes: number;
  indexSizeBytes: number;
}

@Injectable()
export class DatabaseMonitorService {
  constructor(private readonly dataSource: DataSource) {}

  async getStorageSummary(): Promise<ServiceResultContainer<DatabaseStorageSummaryDto>> {
    const rows: RawTableInfo[] = await this.dataSource.query(`
      SELECT
        table_name AS tableName,
        table_rows AS rowCount,
        data_length AS dataSizeBytes,
        index_length AS indexSizeBytes
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
        AND table_type = 'BASE TABLE'
      ORDER BY (data_length + index_length) DESC
    `);

    const tables: DatabaseTableStorageDto[] = rows.map((row) => {
      const rowCount = Number(row.rowCount ?? 0);
      const dataSizeBytes = Number(row.dataSizeBytes ?? 0);
      const indexSizeBytes = Number(row.indexSizeBytes ?? 0);
      const totalSizeBytes = dataSizeBytes + indexSizeBytes;

      return {
        tableName: row.tableName,
        rowCount,
        dataSizeBytes,
        indexSizeBytes,
        totalSizeBytes,
        dataSizeFormatted: this.formatBytes(dataSizeBytes),
        indexSizeFormatted: this.formatBytes(indexSizeBytes),
        totalSizeFormatted: this.formatBytes(totalSizeBytes),
        percentOfDatabase: 0,
      };
    });

    const totalSizeBytes = tables.reduce((sum, t) => sum + t.totalSizeBytes, 0);

    for (const table of tables) {
      table.percentOfDatabase = totalSizeBytes > 0
        ? Math.round((table.totalSizeBytes / totalSizeBytes) * 1000) / 10
        : 0;
    }

    const totalRows = tables.reduce((sum, t) => sum + t.rowCount, 0);

    const dbNameRows: { dbName: string }[] = await this.dataSource.query(
      'SELECT DATABASE() AS dbName',
    );

    return {
      success: true,
      message: 'Database storage summary retrieved successfully',
      result: {
        databaseName: dbNameRows[0]?.dbName ?? 'unknown',
        tableCount: tables.length,
        totalRows,
        totalSizeBytes,
        totalSizeFormatted: this.formatBytes(totalSizeBytes),
        largestTableName: tables[0]?.tableName ?? null,
        tables,
      },
    };
  }

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const value = bytes / Math.pow(1024, i);
    return `${Math.round(value * 10) / 10} ${units[i]}`;
  }
}
