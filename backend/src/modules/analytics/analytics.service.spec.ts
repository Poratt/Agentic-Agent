import { BadRequestException } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsGroupBy } from './dto/analytics-group-by.enum';
import { AnalyticsMetric } from './dto/analytics-metric.enum';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  const usersRepo = {
    createQueryBuilder: jest.fn(),
  };
  const chatSessionRepo = {
    createQueryBuilder: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AnalyticsService(usersRepo as never, chatSessionRepo as never);
  });

  it('rejects unsupported metric values', async () => {
    await expect(
      service.query({
        metric: 999 as AnalyticsMetric,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects unsupported groupBy values for a selected metric', async () => {
    await expect(
      service.query({
        metric: AnalyticsMetric.UsersByRole,
        groupBy: AnalyticsGroupBy.Day,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects date ranges where from is after to', async () => {
    await expect(
      service.query({
        metric: AnalyticsMetric.UserSignupsOverTime,
        groupBy: AnalyticsGroupBy.Day,
        range: {
          from: '2026-06-30',
          to: '2026-06-01',
        },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects date ranges that exceed the maximum analytics range', async () => {
    await expect(
      service.query({
        metric: AnalyticsMetric.UserSignupsOverTime,
        groupBy: AnalyticsGroupBy.Day,
        range: {
          from: '2025-01-01',
          to: '2026-06-30',
        },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns users by role in the standard analytics response shape', async () => {
    const getRawMany = jest.fn().mockResolvedValue([
      { role: AnalyticsMetric.UsersByRole, value: '2' },
      { role: '2', value: '5' },
    ]);
    usersRepo.createQueryBuilder.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getRawMany,
    });

    const result = await service.query({
      metric: AnalyticsMetric.UsersByRole,
      groupBy: AnalyticsGroupBy.Role,
    });

    expect(result.success).toBe(true);
    expect(result.result.title).toBe('Users by role');
    expect(result.result.series).toEqual([
      { label: 'Admin', value: 2 },
      { label: 'User', value: 5 },
    ]);
  });

  it('returns user signups over time in the standard analytics response shape', async () => {
    const getRawMany = jest.fn().mockResolvedValue([{ label: '2026-06-01', value: '3' }]);
    usersRepo.createQueryBuilder.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getRawMany,
    });

    const result = await service.query({
      metric: AnalyticsMetric.UserSignupsOverTime,
      groupBy: AnalyticsGroupBy.Day,
      range: {
        from: '2026-06-01',
        to: '2026-06-30',
      },
    });

    expect(result.success).toBe(true);
    expect(result.result.title).toBe('User signups over time');
    expect(result.result.series).toEqual([{ label: '2026-06-01', value: 3, date: '2026-06-01' }]);
  });

  it('returns active sessions over time in the standard analytics response shape', async () => {
    const getRawMany = jest.fn().mockResolvedValue([{ label: '2026-06-01', value: '7' }]);
    chatSessionRepo.createQueryBuilder.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getRawMany,
    });

    const result = await service.query({
      metric: AnalyticsMetric.ActiveSessionsOverTime,
      groupBy: AnalyticsGroupBy.Day,
      range: {
        from: '2026-06-01',
        to: '2026-06-30',
      },
    });

    expect(result.success).toBe(true);
    expect(result.result.title).toBe('Active sessions over time');
    expect(result.result.series).toEqual([{ label: '2026-06-01', value: 7, date: '2026-06-01' }]);
  });
});
