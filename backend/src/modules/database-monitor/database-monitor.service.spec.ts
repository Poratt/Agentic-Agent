import { DatabaseMonitorService } from './database-monitor.service';

describe('DatabaseMonitorService', () => {
  let service: DatabaseMonitorService;

  const mockQuery = jest.fn();
  const dataSource = { query: mockQuery };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new DatabaseMonitorService(dataSource as never);
  });

  it('returns a sorted summary of table storage', async () => {
    mockQuery
      .mockResolvedValueOnce([
        { tableName: 'chat_messages', rowCount: 5000, dataSizeBytes: 409600, indexSizeBytes: 102400 },
        { tableName: 'users', rowCount: 200, dataSizeBytes: 81920, indexSizeBytes: 20480 },
      ])
      .mockResolvedValueOnce([{ dbName: 'test_db' }]);

    const result = await service.getStorageSummary();

    expect(result.success).toBe(true);
    expect(result.result.databaseName).toBe('test_db');
    expect(result.result.tableCount).toBe(2);
    expect(result.result.totalRows).toBe(5200);
    expect(result.result.largestTableName).toBe('chat_messages');

    const tables = result.result.tables;
    expect(tables[0].tableName).toBe('chat_messages');
    expect(tables[0].totalSizeBytes).toBe(512000);
    expect(tables[1].tableName).toBe('users');
    expect(tables[1].totalSizeBytes).toBe(102400);
  });

  it('returns empty tables when no tables exist', async () => {
    mockQuery
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ dbName: 'empty_db' }]);

    const result = await service.getStorageSummary();

    expect(result.success).toBe(true);
    expect(result.result.tableCount).toBe(0);
    expect(result.result.tables).toEqual([]);
    expect(result.result.totalSizeBytes).toBe(0);
    expect(result.result.largestTableName).toBeNull();
  });

  it('formats bytes correctly', () => {
    expect(service.formatBytes(0)).toBe('0 B');
    expect(service.formatBytes(1023)).toBe('1023 B');
    expect(service.formatBytes(1024)).toBe('1 KB');
    expect(service.formatBytes(1536)).toBe('1.5 KB');
    expect(service.formatBytes(1048576)).toBe('1 MB');
    expect(service.formatBytes(1073741824)).toBe('1 GB');
  });

  it('does not divide by zero when total size is zero', async () => {
    mockQuery
      .mockResolvedValueOnce([
        { tableName: 'empty_table', rowCount: 0, dataSizeBytes: 0, indexSizeBytes: 0 },
      ])
      .mockResolvedValueOnce([{ dbName: 'test_db' }]);

    const result = await service.getStorageSummary();

    expect(result.success).toBe(true);
    expect(result.result.tables[0].percentOfDatabase).toBe(0);
  });

  it('calculates percentOfDatabase correctly', async () => {
    mockQuery
      .mockResolvedValueOnce([
        { tableName: 'big', rowCount: 100, dataSizeBytes: 750000, indexSizeBytes: 0 },
        { tableName: 'small', rowCount: 50, dataSizeBytes: 250000, indexSizeBytes: 0 },
      ])
      .mockResolvedValueOnce([{ dbName: 'test_db' }]);

    const result = await service.getStorageSummary();

    expect(result.result.tables[0].percentOfDatabase).toBe(75);
    expect(result.result.tables[1].percentOfDatabase).toBe(25);
  });

  it('uses a fixed query without user input', async () => {
    mockQuery
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ dbName: 'test_db' }]);

    await service.getStorageSummary();

    const tableQuery = mockQuery.mock.calls[0][0];
    expect(tableQuery).toContain('information_schema.tables');
    expect(tableQuery).toContain('DATABASE()');
    expect(tableQuery).not.toContain('${');
  });

  it('handles null rowCount values', async () => {
    mockQuery
      .mockResolvedValueOnce([
        { tableName: 't1', rowCount: null, dataSizeBytes: 1024, indexSizeBytes: 512 },
      ])
      .mockResolvedValueOnce([{ dbName: 'test_db' }]);

    const result = await service.getStorageSummary();

    expect(result.result.tables[0].rowCount).toBe(0);
  });
});
