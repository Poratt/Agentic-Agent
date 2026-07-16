import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { RenderSpec, RenderSpecType, renderSpecDiscriminatedSchema } from './render-spec.interface';
import {
  WeatherCurrentRenderSpecSchema,
  WeatherForecastRenderSpecSchema,
} from './weather.render-spec';
import { CurrencyRenderSpecSchema } from './currency.render-spec';
import {
  UserProfileRenderSpecSchema,
  UsersTableRenderSpecSchema,
  RoleChangeRenderSpecSchema,
} from './users.render-spec';
import {
  ChatSessionsRenderSpecSchema,
  TranscriptRenderSpecSchema,
  SessionCreatedRenderSpecSchema,
} from './chat.render-spec';
import { AnalyticsChartRenderSpecSchema } from './analytics.render-spec';
import { SystemStatusRenderSpecSchema } from './system.render-spec';
import { DatabaseStorageRenderSpecSchema } from './db-monitor.render-spec';
import { LlmTestResultsRenderSpecSchema } from './llm.render-spec';
import {
  DeleteConfirmRenderSpecSchema,
  RegisterFormRenderSpecSchema,
} from './common.render-spec';

type ToolRenderMapping = {
  toolName: string;
  renderType: RenderSpecType;
  schema: z.ZodObject<any>;
  transform: (resultData: any) => Record<string, unknown>;
};

const toNumber = (value: unknown): number | undefined => {
  if (value === null || value === undefined || value === '') return undefined;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : undefined;
};

const toBool = (value: unknown): boolean | undefined => {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return undefined;
};

const TOOL_RENDER_MAPPINGS: ToolRenderMapping[] = [
  {
    toolName: 'WeatherController_getWeather',
    renderType: RenderSpecType.WeatherCurrent,
    schema: WeatherCurrentRenderSpecSchema,
    transform: (data) => {
      const r = data.result ?? data;
      return {
        location: data.location ?? r.city ?? r.location,
        tempC: toNumber(r.tempC),
        feelsLikeC: toNumber(r.feelsLikeC),
        tempF: toNumber(r.tempF),
        feelsLikeF: toNumber(r.feelsLikeF),
        humidity: toNumber(r.humidity),
        windSpeedKmph: toNumber(r.windSpeedKmph ?? r.windSpeed),
        windDirection: r.windDirection,
        uvIndex: toNumber(r.uvIndex),
        cloudCover: toNumber(r.cloudCover),
        precipitationMm: toNumber(r.precipitationMm ?? r.precipitationInches),
        pressure: toNumber(r.pressure),
        visibility: toNumber(r.visibility),
        weatherDesc: r.description,
        weatherEmoji: r.weatherEmoji,
        observationTime: r.observationTime,
        requestLocalTime: r.requestLocalTime,
      };
    },
  },
  {
    toolName: 'WeatherController_getForecast',
    renderType: RenderSpecType.WeatherForecast,
    schema: WeatherForecastRenderSpecSchema,
    transform: (data) => {
      const r = data.result ?? data;
      const city = r.city ?? data.location;
      const list = Array.isArray(r.forecast) ? r.forecast : [];
      return {
        location: city,
        forecast: list.map((d: any) => ({
          date: d.date,
          dayName: d.dayName,
          maxTempC: toNumber(d.tempMax ?? d.maxTempC),
          minTempC: toNumber(d.tempMin ?? d.minTempC),
          humidity: toNumber(d.humidity),
          weatherDesc: d.description ?? d.weatherDesc,
          weatherEmoji: d.emoji ?? d.weatherEmoji,
        })),
      };
    },
  },
  {
    toolName: 'CurrencyController_getRates',
    renderType: RenderSpecType.Currency,
    schema: CurrencyRenderSpecSchema,
    transform: (data) => {
      const r = data.result ?? data;
      return {
        sourceCurrency: r.base ?? data.sourceCurrency,
        targetCurrency: r.target,
        amount: toNumber(r.amount),
        convertedAmount: toNumber(r.result),
        rate: toNumber(r.rate),
        lastUpdated: r.date ?? data.lastUpdated,
        rates: r.rates,
        mode: 'rates',
      };
    },
  },
  {
    toolName: 'CurrencyController_convert',
    renderType: RenderSpecType.Currency,
    schema: CurrencyRenderSpecSchema,
    transform: (data) => {
      const r = data.result ?? data;
      return {
        sourceCurrency: r.from ?? data.sourceCurrency,
        targetCurrency: r.to ?? data.targetCurrency,
        amount: toNumber(r.amount),
        convertedAmount: toNumber(r.result),
        rate: toNumber(r.rate),
        lastUpdated: r.date ?? data.lastUpdated,
        mode: 'convert',
      };
    },
  },
  {
    toolName: 'UsersController_me',
    renderType: RenderSpecType.UserProfile,
    schema: UserProfileRenderSpecSchema,
    transform: (data) => {
      const r = data.result ?? data.data ?? data;
      return {
        sub: toNumber(r.sub ?? r.id),
        email: r.email,
        role: toNumber(r.role),
        iat: toNumber(r.iat),
        exp: toNumber(r.exp),
      };
    },
  },
  {
    toolName: 'UsersController_list',
    renderType: RenderSpecType.UsersTable,
    schema: UsersTableRenderSpecSchema,
    transform: (data) => {
      const list = data.result ?? data.data ?? (Array.isArray(data) ? data : []);
      return {
        users: Array.isArray(list)
          ? list.map((u: any) => ({
              id: toNumber(u.id),
              fullName: u.fullName,
              email: u.email,
              role: toNumber(u.role),
              createdAt: u.createdAt,
            }))
          : [],
      };
    },
  },
  {
    toolName: 'UsersController_getById',
    renderType: RenderSpecType.UsersTable,
    schema: UsersTableRenderSpecSchema,
    transform: (data) => {
      const r = data.result ?? data.data ?? data;
      return {
        users: [
          {
            id: toNumber(r.id),
            fullName: r.fullName,
            email: r.email,
            role: toNumber(r.role),
            createdAt: r.createdAt,
          },
        ],
      };
    },
  },
  {
    toolName: 'UsersController_updateRole',
    renderType: RenderSpecType.RoleChange,
    schema: RoleChangeRenderSpecSchema,
    transform: (data) => {
      const r = data.result ?? data.data ?? data;
      return {
        id: toNumber(r.id),
        email: r.email,
        fullName: r.fullName,
        role: toNumber(r.role),
        updatedAt: r.updatedAt,
      };
    },
  },
  {
    toolName: 'AdminAgentController_getSessions',
    renderType: RenderSpecType.ChatSessions,
    schema: ChatSessionsRenderSpecSchema,
    transform: (data) => {
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data.result)
          ? data.result
          : Array.isArray(data.data)
            ? data.data
            : Array.isArray(data.sessions)
              ? data.sessions
              : [];
      return {
        sessions: list.map((s: any) => ({
          id: toNumber(s.id),
          title: s.title,
          createdAt: s.createdAt,
          updatedAt: s.updatedAt,
        })),
      };
    },
  },
  {
    toolName: 'AdminAgentController_getSessionMessages',
    renderType: RenderSpecType.Transcript,
    schema: TranscriptRenderSpecSchema,
    transform: (data) => {
      const r = data.messages ? data : (data.result ?? data.data ?? data);
      return {
        sessionId: toNumber(r.sessionId),
        messages: Array.isArray(r.messages) ? r.messages : [],
      };
    },
  },
  {
    toolName: 'AdminAgentController_createSession',
    renderType: RenderSpecType.SessionCreated,
    schema: SessionCreatedRenderSpecSchema,
    transform: (data) => {
      const r = data.result ?? data;
      return {
        id: toNumber(r.id),
        title: r.title,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      };
    },
  },
  {
    toolName: 'AnalyticsController_query',
    renderType: RenderSpecType.AnalyticsChart,
    schema: AnalyticsChartRenderSpecSchema,
    transform: (data) => {
      const r = data.result ?? data;
      return {
        chartType: toNumber(r.chartType),
        title: r.title,
        summary: r.summary,
        maxValue: toNumber(r.maxValue),
        series: Array.isArray(r.series) ? r.series : [],
      };
    },
  },
  {
    toolName: 'SystemController_getStatus',
    renderType: RenderSpecType.SystemStatus,
    schema: SystemStatusRenderSpecSchema,
    transform: (data) => {
      const r = data.result ?? data;
      return {
        totalUsers: toNumber(r.totalUsers),
        activeSessions: toNumber(r.activeSessions),
        swaggerStatus: toBool(r.isSwaggerUpToDate) ?? r.swaggerStatus,
        uptime: toNumber(r.uptime),
        nodeVersion: r.nodeVersion,
      };
    },
  },
  {
    toolName: 'DatabaseMonitorController_getStorage',
    renderType: RenderSpecType.DatabaseStorage,
    schema: DatabaseStorageRenderSpecSchema,
    transform: (data) => {
      const r = data.result ?? data;
      return {
        databaseName: r.databaseName,
        tableCount: toNumber(r.tableCount),
        totalRows: toNumber(r.totalRows),
        totalSizeFormatted: r.totalSizeFormatted,
        tables: Array.isArray(r.tables) ? r.tables : [],
      };
    },
  },
  {
    toolName: 'LlmController_testModel',
    renderType: RenderSpecType.LlmTestResults,
    schema: LlmTestResultsRenderSpecSchema,
    transform: (data) => {
      const r = data.result ?? data;
      const single = {
        model: r.model,
        provider: r.provider,
        status: r.available ? 'success' : (r.status ?? 'error'),
        latencyMs: toNumber(r.responseTimeMs ?? r.latencyMs),
      };
      return {
        results: [single],
        summary: undefined,
      };
    },
  },
  {
    toolName: 'AuthController_register',
    renderType: RenderSpecType.RegisterForm,
    schema: RegisterFormRenderSpecSchema,
    transform: (data) => {
      const r = data.result ?? data;
      return {
        fullName: r.fullName,
        email: r.email,
        password: undefined,
      };
    },
  },
];

@Injectable()
export class RenderSpecService {
  private readonly logger = new Logger(RenderSpecService.name);
  private readonly toolMappingMap: Map<string, ToolRenderMapping>;

  constructor() {
    this.toolMappingMap = new Map(TOOL_RENDER_MAPPINGS.map((m) => [m.toolName, m]));
  }

  buildRenderSpec(toolName: string, resultData: any): RenderSpec | null {
    try {
      const mapping = this.toolMappingMap.get(toolName);
      if (!mapping) {
        this.logger.debug(`No render mapping for tool: ${toolName}`);
        return null;
      }

      let parsed: any;
      try {
        parsed = typeof resultData === 'string' ? JSON.parse(resultData) : resultData;
      } catch {
        this.logger.warn(`RenderSpec: failed to parse resultData for ${toolName}`);
        return null;
      }

      if (!parsed || typeof parsed !== 'object') {
        this.logger.warn(`RenderSpec: resultData is not an object for ${toolName}`);
        return null;
      }

      if (parsed.error) {
        this.logger.debug(`RenderSpec: tool result has error for ${toolName}`);
        return null;
      }

      const data = mapping.transform(parsed);

      const candidate = { type: mapping.renderType, data };
      const validationResult = mapping.schema.safeParse(candidate);

      if (!validationResult.success) {
        this.logger.warn(
          `RenderSpec validation failed for ${toolName}: ${validationResult.error.message}`,
        );
        return null;
      }

      this.logger.log(`RenderSpec built for ${toolName}: type=${mapping.renderType}`);
      return validationResult.data as RenderSpec;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`buildRenderSpec failed for ${toolName}: ${message}`);
      return null;
    }
  }
}
