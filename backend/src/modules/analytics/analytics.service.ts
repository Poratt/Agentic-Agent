import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatSession } from '../admin-agent/entities/chat-session.entity';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../../core/enums/user-role.enum';
import { ServiceResultContainer } from '../../core/models/service-result-container.model';
import {
  ANALYTICS_CATALOG,
  ANALYTICS_MAX_RANGE_DAYS,
  AnalyticsCatalogItem,
} from './constants/analytics-catalog.constant';
import { AnalyticsChartType } from './dto/analytics-chart-type.enum';
import { AnalyticsGroupBy } from './dto/analytics-group-by.enum';
import { AnalyticsMetric } from './dto/analytics-metric.enum';
import { AnalyticsQueryDto } from './dto/analytics-query.dto';
import { AnalyticsQueryResponseDto } from './dto/analytics-query-response.dto';
import { AnalyticsSeriesPointDto } from './dto/analytics-series-point.dto';

type DateRange = {
  from: Date;
  to: Date;
};

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    @InjectRepository(ChatSession)
    private readonly chatSessionRepo: Repository<ChatSession>,
  ) {}

  async query(dto: AnalyticsQueryDto): Promise<ServiceResultContainer<AnalyticsQueryResponseDto>> {
    const catalogItem = ANALYTICS_CATALOG[dto.metric];
    if (!catalogItem) {
      throw new BadRequestException('Unsupported analytics metric');
    }

    const groupBy = dto.groupBy ?? catalogItem.defaultGroupBy;
    this.assertGroupByAllowed(catalogItem, groupBy);

    const result = await this.runMetric(dto.metric, groupBy, dto, catalogItem);

    return {
      success: true,
      message: 'Analytics query completed successfully',
      result,
    };
  }

  private runMetric(
    metric: AnalyticsMetric,
    groupBy: AnalyticsGroupBy,
    dto: AnalyticsQueryDto,
    catalogItem: AnalyticsCatalogItem,
  ): Promise<AnalyticsQueryResponseDto> {
    switch (metric) {
      case AnalyticsMetric.UsersByRole:
        return this.usersByRole(catalogItem);
      case AnalyticsMetric.UserSignupsOverTime:
        return this.userSignupsOverTime(groupBy, dto, catalogItem);
      case AnalyticsMetric.ActiveSessionsOverTime:
        return this.activeSessionsOverTime(groupBy, dto, catalogItem);
      default:
        throw new BadRequestException('Unsupported analytics metric');
    }
  }

  private async usersByRole(catalogItem: AnalyticsCatalogItem): Promise<AnalyticsQueryResponseDto> {
    const rows = await this.usersRepo
      .createQueryBuilder('u')
      .select('u.role', 'role')
      .addSelect('COUNT(u.id)', 'value')
      .groupBy('u.role')
      .orderBy('u.role', 'ASC')
      .getRawMany<{ role: UserRole | string; value: string }>();

    const series = rows.map((row) => {
      const role = Number(row.role) as UserRole;
      return {
        label: this.roleLabel(role),
        value: Number(row.value),
      };
    });

    return {
      title: catalogItem.title,
      chartType: AnalyticsChartType.Pie,
      series,
      summary: this.totalSummary(series, 'users found across roles'),
    };
  }

  private async userSignupsOverTime(
    groupBy: AnalyticsGroupBy,
    dto: AnalyticsQueryDto,
    catalogItem: AnalyticsCatalogItem,
  ): Promise<AnalyticsQueryResponseDto> {
    const range = this.resolveRange(dto, catalogItem);
    const bucketSql = this.dateBucketSql('u', 'createdAt', groupBy);

    const rows = await this.usersRepo
      .createQueryBuilder('u')
      .select(bucketSql, 'label')
      .addSelect('COUNT(u.id)', 'value')
      .where('u.createdAt BETWEEN :from AND :to', range)
      .groupBy('label')
      .orderBy('label', 'ASC')
      .getRawMany<{ label: string; value: string }>();

    const series = this.toTimeSeries(rows);

    return {
      title: catalogItem.title,
      chartType: catalogItem.chartType,
      xAxisLabel: this.groupByLabel(groupBy),
      yAxisLabel: 'Users',
      series,
      summary: this.totalSummary(series, 'user signups found in the selected range'),
    };
  }

  private async activeSessionsOverTime(
    groupBy: AnalyticsGroupBy,
    dto: AnalyticsQueryDto,
    catalogItem: AnalyticsCatalogItem,
  ): Promise<AnalyticsQueryResponseDto> {
    const range = this.resolveRange(dto, catalogItem);
    const bucketSql = this.dateBucketSql('chatSession', 'createdAt', groupBy);

    const rows = await this.chatSessionRepo
      .createQueryBuilder('chatSession')
      .select(bucketSql, 'label')
      .addSelect('COUNT(chatSession.id)', 'value')
      .where('chatSession.createdAt BETWEEN :from AND :to', range)
      .groupBy('label')
      .orderBy('label', 'ASC')
      .getRawMany<{ label: string; value: string }>();

    const series = this.toTimeSeries(rows);

    return {
      title: catalogItem.title,
      chartType: catalogItem.chartType,
      xAxisLabel: this.groupByLabel(groupBy),
      yAxisLabel: 'Sessions',
      series,
      summary: this.totalSummary(series, 'sessions found in the selected range'),
    };
  }

  private assertGroupByAllowed(catalogItem: AnalyticsCatalogItem, groupBy: AnalyticsGroupBy): void {
    if (!catalogItem.allowedGroupBy.includes(groupBy)) {
      throw new BadRequestException('Unsupported groupBy for selected analytics metric');
    }
  }

  private resolveRange(dto: AnalyticsQueryDto, catalogItem: AnalyticsCatalogItem): DateRange {
    const to = dto.range?.to ? new Date(dto.range.to) : new Date();
    const from = dto.range?.from
      ? new Date(dto.range.from)
      : this.daysBefore(to, catalogItem.defaultRangeDays ?? 30);

    from.setHours(0, 0, 0, 0);
    to.setHours(23, 59, 59, 999);

    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      throw new BadRequestException('Invalid analytics date range');
    }

    if (from > to) {
      throw new BadRequestException('Date range from must be before date range to');
    }

    const rangeDays = Math.ceil((to.getTime() - from.getTime()) / 86_400_000);
    if (rangeDays > ANALYTICS_MAX_RANGE_DAYS) {
      throw new BadRequestException(`Analytics date range cannot exceed ${ANALYTICS_MAX_RANGE_DAYS} days`);
    }

    return { from, to };
  }

  private daysBefore(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() - days + 1);
    return result;
  }

  private dateBucketSql(alias: string, column: string, groupBy: AnalyticsGroupBy): string {
    const field = `${alias}.${column}`;

    switch (groupBy) {
      case AnalyticsGroupBy.Hour:
        return `DATE_FORMAT(${field}, '%Y-%m-%d %H:00:00')`;
      case AnalyticsGroupBy.Day:
        return `DATE(${field})`;
      case AnalyticsGroupBy.Week:
        return `DATE_FORMAT(${field}, '%x-W%v')`;
      case AnalyticsGroupBy.Month:
        return `DATE_FORMAT(${field}, '%Y-%m')`;
      default:
        throw new BadRequestException('Unsupported time grouping');
    }
  }

  private toTimeSeries(rows: Array<{ label: string; value: string }>): AnalyticsSeriesPointDto[] {
    return rows.map((row) => ({
      label: row.label,
      value: Number(row.value),
      date: row.label,
    }));
  }

  private totalSummary(series: AnalyticsSeriesPointDto[], suffix: string): string {
    const total = series.reduce((sum, point) => sum + point.value, 0);
    return `${total} ${suffix}.`;
  }

  private groupByLabel(groupBy: AnalyticsGroupBy): string {
    switch (groupBy) {
      case AnalyticsGroupBy.Hour:
        return 'Hour';
      case AnalyticsGroupBy.Day:
        return 'Day';
      case AnalyticsGroupBy.Week:
        return 'Week';
      case AnalyticsGroupBy.Month:
        return 'Month';
      case AnalyticsGroupBy.Role:
        return 'Role';
      default:
        return 'Bucket';
    }
  }

  private roleLabel(role: UserRole): string {
    switch (role) {
      case UserRole.Admin:
        return 'Admin';
      case UserRole.User:
        return 'User';
      default:
        return `Role ${role}`;
    }
  }
}
