import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { RenderSpec, RenderSpecType, renderSpecDiscriminatedSchema } from './render-spec.interface';
import {
  WeatherCurrentRenderSpecSchema,
  WeatherForecastRenderSpecSchema,
  WeatherSummaryRenderSpecSchema,
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
import { AgnesImageRenderSpecSchema } from './image.render-spec';
import { AgnesVideoRenderSpecSchema } from './video.render-spec';
import {
  DeleteConfirmRenderSpecSchema,
  RegisterFormRenderSpecSchema,
} from './common.render-spec';

type ToolRenderMapping = {
  toolName: string;
  renderType: RenderSpecType;
  source?: 'swagger' | 'mcp';
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

const WEATHER_DESC_HE: Record<string, string> = {
  'clear sky': 'שמים בהירים',
  'clear': 'בהיר',
  'mainly clear': 'בהיר בעיקר',
  'partly cloudy': 'מעונן חלקית',
  'cloudy': 'מעונן',
  'overcast': 'מעונן לחלוטין',
  'light rain': 'גשם קל',
  'moderate rain': 'גשם בינוני',
  'heavy rain': 'גשם חזק',
  'rain': 'גשם',
  'slight rain showers': 'מטרות גשם קלות',
  'light snow': 'שלג קל',
  'moderate snow': 'שלג בינוני',
  'heavy snow': 'שלג חזק',
  'snow': 'שלג',
  'thunderstorm': 'סופת רעמים',
  'drizzle': 'טפטוף',
  'fog': 'ערפל',
  'foggy': 'מעורפל',
  'mist': 'ערפיח',
  'haze': 'אובך',
  'hazy': 'אובכני',
  'windy': 'מנשב',
  'hot': 'חם',
  'cold': 'קר',
  'humid': 'לח',
  'dry': 'יבש',
};

const CITY_NAME_HE: Record<string, string> = {
  'tel aviv': 'תל אביב',
  'tel-aviv': 'תל אביב',
  'jerusalem': 'ירושלים',
  'haifa': 'חיפה',
  'rishon lezion': 'ראשון לציון',
  'petah tikva': 'פתח תקווה',
  'ashdod': 'אשדוד',
  'netanya': 'נתניה',
  'beersheba': 'באר שבע',
  'holon': 'חולון',
  'bnei brak': 'בני ברק',
  'ramat gan': 'רמת גן',
  'herzliya': 'הרצליה',
  'kfar saba': 'כפר סבא',
  'raanana': 'רעננה',
  'rehovot': 'רחובות',
  'bat yam': 'בת ים',
  'ashkelon': 'אשקלון',
  'nahariya': 'נהריה',
  'eilat': 'אילת',
  'tiberias': 'טבריה',
  'nazareth': 'נצרת',
  'afula': 'עפולה',
  'arad': 'ערד',
  'carmiel': 'כרמיאל',
  'dimona': 'דימונה',
  'ynet': 'אילת',
  'new york': 'ניו יורק',
  'london': 'לונדון',
  'paris': 'פריז',
  'tokyo': 'טוקיו',
  'berlin': 'ברלין',
  'madrid': 'מדריד',
  'rome': 'רומא',
  'moscow': 'מוסקבה',
  'beijing': 'בייג\'ין',
  'sydney:': 'סידני',
};

const TOOL_RENDER_MAPPINGS: ToolRenderMapping[] = [
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
    toolName: 'LlmController_generateImage',
    renderType: RenderSpecType.AgnesImage,
    schema: AgnesImageRenderSpecSchema,
    transform: (data) => {
      const r = data.result ?? data.data ?? data;
      console.log(`[AgnesImage transform] raw=${JSON.stringify(data).slice(0, 400)} | size=${r.size} | model=${r.model}`);
      return {
        url: r.url ?? undefined,
        b64Json: r.b64Json ?? r.b64_json ?? undefined,
        mimeType: r.mimeType ?? r.mime_type ?? undefined,
        size: r.size ?? undefined,
        model: r.model ?? undefined,
      };
    },
  },
  {
    toolName: 'LlmController_getVideo',
    renderType: RenderSpecType.AgnesVideo,
    schema: AgnesVideoRenderSpecSchema,
    transform: (data) => {
      const r = data.result ?? data.data ?? data;
      return {
        url: r.url ?? r.video_url ?? undefined,
        status: r.status,
        seconds: r.seconds,
        model: r.model ?? undefined,
      };
    },
  },
  {
    toolName: 'LlmController_createVideo',
    renderType: RenderSpecType.AgnesVideo,
    schema: AgnesVideoRenderSpecSchema,
    transform: (data) => {
      const r = data.result ?? data.data ?? data;
      return {
        url: r.url ?? r.video_url ?? undefined,
        status: r.status,
        seconds: r.seconds,
        model: r.model ?? undefined,
      };
    },
  },
  {
    toolName: 'LlmController_extendVideo',
    renderType: RenderSpecType.AgnesVideo,
    schema: AgnesVideoRenderSpecSchema,
    transform: (data) => {
      const r = data.result ?? data.data ?? data;
      return {
        url: r.url ?? r.video_url ?? undefined,
        status: r.status,
        seconds: r.seconds,
        model: r.model ?? undefined,
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
  {
    toolName: 'get_current_conditions',
    renderType: RenderSpecType.WeatherCurrent,
    source: 'mcp',
    schema: WeatherCurrentRenderSpecSchema,
    transform: (text) => {
      const s = String(text ?? '');
      const get = (label: string): string | undefined => {
        const m = s.match(new RegExp(`\\*\\*${label}:\\*\\*\\s*(.+)`, 'i'));
        return m?.[1]?.trim();
      };
      const parseTemp = (raw: string | undefined): number | undefined => {
        if (!raw) return undefined;
        const m = raw.match(/(-?[\d.]+)/);
        if (!m) return undefined;
        const val = Number(m[1]);
        return /°f/i.test(raw) ? Math.round((val - 32) * 5 / 9) : val;
      };
      const rawLocation = s.match(/\*\*Location:\*\*\s*(.+)/)?.[1]?.trim() ?? '';
      const cityRaw = rawLocation.split(',')[0]?.trim() ?? rawLocation;
      const cityOnly = CITY_NAME_HE[cityRaw.toLowerCase()] ?? cityRaw;
      const rawDesc = get('Conditions');
      const weatherDesc = rawDesc ? (WEATHER_DESC_HE[rawDesc.toLowerCase()] ?? rawDesc) : undefined;
      return {
        location: cityOnly,
        weatherDesc,
        tempC: parseTemp(get('Temperature')),
        feelsLikeC: parseTemp(get('Feels Like')),
        humidity: parseTemp(get('Humidity')),
        windSpeedKmph: parseTemp(get('Wind')),
        cloudCover: parseTemp(get('Cloud Cover')),
        pressure: parseTemp(get('Pressure')),
      };
    },
  },
  {
    toolName: 'get_forecast',
    renderType: RenderSpecType.WeatherForecast,
    source: 'mcp',
    schema: WeatherForecastRenderSpecSchema,
    transform: (text) => {
      const s = String(text ?? '');
      const rawLocation = s.match(/\*\*Location:\*\*\s*(.+)/)?.[1]?.trim() ?? '';
      const cityRaw = rawLocation.split(',')[0]?.trim() ?? rawLocation;
      const cityOnly = CITY_NAME_HE[cityRaw.toLowerCase()] ?? cityRaw;
      const dayBlocks = s.split(/^## /m).slice(1);
      const forecast = dayBlocks.map((block) => {
        const lines = block.split('\n');
        const dayName = lines[0]?.replace(/\*.*$/,'').trim();
        const get = (label: string): string | undefined => {
          const m = block.match(new RegExp(`\\*\\*${label}:\\*\\*\\s*(.+)`, 'i'));
          return m?.[1]?.trim();
        };
        const parseTemp = (raw: string | undefined): number | undefined => {
          if (!raw) return undefined;
          const m = raw.match(/High\s+(-?[\d.]+)/i);
          if (!m) return undefined;
          const val = Number(m[1]);
          return /°f/i.test(raw) ? Math.round((val - 32) * 5 / 9) : val;
        };
        const parseLow = (raw: string | undefined): number | undefined => {
          if (!raw) return undefined;
          const m = raw.match(/Low\s+(-?[\d.]+)/i);
          if (!m) return undefined;
          const val = Number(m[1]);
          return /°f/i.test(raw) ? Math.round((val - 32) * 5 / 9) : val;
        };
        const tempRaw = get('Temperature');
        const rawDesc = get('Conditions');
        const weatherDesc = rawDesc ? (WEATHER_DESC_HE[rawDesc.toLowerCase()] ?? rawDesc) : undefined;
        return {
          dayName,
          weatherDesc,
          maxTempC: parseTemp(tempRaw),
          minTempC: parseLow(tempRaw),
          humidity: undefined,
          weatherEmoji: undefined,
        };
      });
      return { location: cityOnly, forecast };
    },
  },
  {
    toolName: 'get_weather_summary',
    renderType: RenderSpecType.WeatherSummary,
    source: 'mcp',
    schema: WeatherSummaryRenderSpecSchema,
    transform: (text) => {
      const s = String(text ?? '');
      const rawLocation = s.match(/\*\*Location:\*\*\s*(.+)/)?.[1]?.trim() ?? '';
      const cityRaw = rawLocation.split(',')[0]?.trim() ?? rawLocation;
      const cityOnly = CITY_NAME_HE[cityRaw.toLowerCase()] ?? cityRaw;

      const get = (label: string): string | undefined => {
        const m = s.match(new RegExp(`\\*\\*${label}:\\*\\*\\s*(.+)`, 'i'));
        return m?.[1]?.trim();
      };
      const parseTemp = (raw: string | undefined): number | undefined => {
        if (!raw) return undefined;
        const m = raw.match(/(-?[\d.]+)/);
        if (!m) return undefined;
        const val = Number(m[1]);
        return /°f/i.test(raw) ? Math.round((val - 32) * 5 / 9) : val;
      };

      const rawDesc = get('Conditions');
      const weatherDesc = rawDesc ? (WEATHER_DESC_HE[rawDesc.toLowerCase()] ?? rawDesc) : undefined;

      const current = {
        weatherDesc,
        tempC: parseTemp(get('Temperature')),
        feelsLikeC: parseTemp(get('Feels Like')),
        humidity: parseTemp(get('Humidity')),
        windSpeedKmph: parseTemp(get('Wind')),
        cloudCover: parseTemp(get('Cloud Cover')),
        pressure: parseTemp(get('Pressure')),
        observationTime: get('Time'),
      };

      const dayBlocks = s.split(/^## /m).slice(1);
      const forecast = dayBlocks
        .filter((block) => /\*\*Temperature:\*\*/i.test(block))
        .map((block) => {
          const dayName = block.split('\n')[0]?.replace(/\*.*$/, '').trim();
          const getF = (label: string): string | undefined => {
            const m = block.match(new RegExp(`\\*\\*${label}:\\*\\*\\s*(.+)`, 'i'));
            return m?.[1]?.trim();
          };
          const parseHigh = (raw: string | undefined): number | undefined => {
            if (!raw) return undefined;
            const m = raw.match(/High\s+(-?[\d.]+)/i);
            if (!m) return undefined;
            const val = Number(m[1]);
            return /°f/i.test(raw) ? Math.round((val - 32) * 5 / 9) : val;
          };
          const parseLow = (raw: string | undefined): number | undefined => {
            if (!raw) return undefined;
            const m = raw.match(/Low\s+(-?[\d.]+)/i);
            if (!m) return undefined;
            const val = Number(m[1]);
            return /°f/i.test(raw) ? Math.round((val - 32) * 5 / 9) : val;
          };
          const tempRaw = getF('Temperature');
          const fDesc = getF('Conditions');
          const fWeatherDesc = fDesc ? (WEATHER_DESC_HE[fDesc.toLowerCase()] ?? fDesc) : undefined;
          return {
            dayName,
            weatherDesc: fWeatherDesc,
            maxTempC: parseHigh(tempRaw),
            minTempC: parseLow(tempRaw),
          };
        });

      const alertBlocks = s.split(/^### /m).slice(1);
      const alerts = alertBlocks
        .filter((b) => /alert|warning|watch|advisory/i.test(b) && !/no active|none/i.test(b))
        .map((b) => {
          const event = b.split('\n')[0]?.trim();
          const sev = b.match(/\*\*Severity:\*\*\s*(.+)/i)?.[1]?.trim();
          const head = b.match(/\*\*Headline:\*\*\s*(.+)/i)?.[1]?.trim();
          return { event, severity: sev, headline: head };
        })
        .filter((a) => a.event);

      return {
        location: cityOnly,
        current,
        forecast,
        alerts: alerts.length > 0 ? alerts : undefined,
      };
    },
  },
];

@Injectable()
export class RenderSpecService {
  private readonly logger = new Logger(RenderSpecService.name);
  private readonly toolMappingMap: Map<string, ToolRenderMapping>;
  private readonly unmappedToolCounts = new Map<string, number>();

  constructor() {
    this.toolMappingMap = new Map(TOOL_RENDER_MAPPINGS.map((m) => [m.toolName, m]));
  }

  buildRenderSpec(toolName: string, resultData: any): RenderSpec | null {
    try {
      const mapping = this.toolMappingMap.get(toolName);
      if (!mapping) {
        const count = (this.unmappedToolCounts.get(toolName) ?? 0) + 1;
        this.unmappedToolCounts.set(toolName, count);
        this.logger.warn(`No render mapping for tool: ${toolName} (hit #${count})`);
        return null;
      }

      const isMcp = mapping.source === 'mcp';

      let parsed: any;
      if (isMcp) {
        if (typeof resultData === 'string') {
          try {
            const maybeJson = JSON.parse(resultData);
            if (maybeJson && typeof maybeJson === 'object' && maybeJson.error) {
              this.logger.debug(`RenderSpec: MCP tool result has error for ${toolName}`);
              return null;
            }
          } catch {
            // Not JSON — it's markdown text, which is the normal MCP path
          }
        }
        parsed = resultData;
      } else {
        try {
          parsed = typeof resultData === 'string' ? JSON.parse(resultData) : resultData;
        } catch {
          this.logger.warn(`RenderSpec: failed to parse resultData for ${toolName}`);
          return null;
        }
      }

      if (!isMcp) {
        if (!parsed || typeof parsed !== 'object') {
          this.logger.warn(`RenderSpec: resultData is not an object for ${toolName}`);
          return null;
        }

        if (parsed.error) {
          this.logger.debug(`RenderSpec: tool result has error for ${toolName}`);
          return null;
        }
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

  getUnmappedToolStats(): Record<string, number> {
    return Object.fromEntries(this.unmappedToolCounts);
  }
}
