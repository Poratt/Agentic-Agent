import { AnalyticsChartType } from '../dto/analytics-chart-type.enum';
import { AnalyticsGroupBy } from '../dto/analytics-group-by.enum';
import { AnalyticsMetric } from '../dto/analytics-metric.enum';

export type AnalyticsCatalogItem = {
  metric: AnalyticsMetric;
  title: string;
  chartType: AnalyticsChartType;
  allowedGroupBy: AnalyticsGroupBy[];
  defaultGroupBy: AnalyticsGroupBy;
  defaultRangeDays?: number;
  description: string;
};

export const ANALYTICS_MAX_RANGE_DAYS = 366;

export const ANALYTICS_CATALOG: Record<AnalyticsMetric, AnalyticsCatalogItem> = {
  [AnalyticsMetric.UsersByRole]: {
    metric: AnalyticsMetric.UsersByRole,
    title: 'Users by role',
    chartType: AnalyticsChartType.Pie,
    allowedGroupBy: [AnalyticsGroupBy.Role],
    defaultGroupBy: AnalyticsGroupBy.Role,
    description: 'Shows the current distribution of users by numeric role.',
  },
  [AnalyticsMetric.UserSignupsOverTime]: {
    metric: AnalyticsMetric.UserSignupsOverTime,
    title: 'User signups over time',
    chartType: AnalyticsChartType.Line,
    allowedGroupBy: [AnalyticsGroupBy.Day, AnalyticsGroupBy.Week, AnalyticsGroupBy.Month],
    defaultGroupBy: AnalyticsGroupBy.Day,
    defaultRangeDays: 30,
    description: 'Shows user creation volume grouped by time bucket.',
  },
  [AnalyticsMetric.ActiveSessionsOverTime]: {
    metric: AnalyticsMetric.ActiveSessionsOverTime,
    title: 'Active sessions over time',
    chartType: AnalyticsChartType.Bar,
    allowedGroupBy: [
      AnalyticsGroupBy.Hour,
      AnalyticsGroupBy.Day,
      AnalyticsGroupBy.Week,
      AnalyticsGroupBy.Month,
    ],
    defaultGroupBy: AnalyticsGroupBy.Day,
    defaultRangeDays: 30,
    description: 'Shows chat session volume grouped by time bucket.',
  },
};

