import { RenderSpecService } from './render-spec.service';
import { RenderSpecType } from './render-spec.interface';

describe('RenderSpecService', () => {
  let service: RenderSpecService;

  beforeEach(() => {
    service = new RenderSpecService();
  });

  describe('buildRenderSpec', () => {
    it('returns null for unknown tool names', () => {
      const result = service.buildRenderSpec('UnknownTool_doSomething', '{}');
      expect(result).toBeNull();
    });

    it('returns null for malformed JSON strings', () => {
      const result = service.buildRenderSpec('WeatherController_getWeather', 'not-json');
      expect(result).toBeNull();
    });

    it('returns null when result contains error field', () => {
      const result = service.buildRenderSpec('WeatherController_getWeather', JSON.stringify({ error: 'fail' }));
      expect(result).toBeNull();
    });

    it('returns null for non-object result data', () => {
      const result = service.buildRenderSpec('WeatherController_getWeather', JSON.stringify('just a string'));
      expect(result).toBeNull();
    });

    it('builds a WeatherCurrent render spec', () => {
      const data = {
        success: true,
        message: 'ok',
        result: {
          tempC: '25',
          feelsLikeC: '23',
          humidity: '60',
          description: 'Partly cloudy',
          windSpeedKmph: '10',
          windDirection: 'N',
          uvIndex: '5',
          cloudCover: '20',
          precipitationMm: '0',
          pressure: '1013',
          visibility: '10',
          observationTime: '12:00',
          requestLocalTime: '15:00',
        },
      };
      const result = service.buildRenderSpec('WeatherController_getWeather', JSON.stringify(data));

      expect(result).not.toBeNull();
      expect(result!.type).toBe(RenderSpecType.WeatherCurrent);
      expect(result!.data).toEqual(expect.objectContaining({
        tempC: 25,
        feelsLikeC: 23,
        humidity: 60,
        weatherDesc: 'Partly cloudy',
        windSpeedKmph: 10,
        windDirection: 'N',
      }));
    });

    it('builds a WeatherForecast render spec', () => {
      const data = {
        success: true,
        message: 'ok',
        result: {
          city: 'Tel Aviv',
          forecast: [
            { date: '2026-07-16', dayName: 'Thursday', tempMax: 30, tempMin: 22, humidity: 50, description: 'Sunny', emoji: '☀️' },
          ],
        },
      };
      const result = service.buildRenderSpec('WeatherController_getForecast', JSON.stringify(data));

      expect(result).not.toBeNull();
      expect(result!.type).toBe(RenderSpecType.WeatherForecast);
      expect(result!.data).toEqual(expect.objectContaining({
        location: 'Tel Aviv',
        forecast: expect.arrayContaining([
          expect.objectContaining({ maxTempC: 30, minTempC: 22, weatherDesc: 'Sunny', weatherEmoji: '☀️' }),
        ]),
      }));
    });

    it('builds a Currency render spec for convert', () => {
      const data = {
        success: true,
        message: 'ok',
        result: {
          from: 'USD',
          to: 'ILS',
          amount: 100,
          rate: 3.65,
          result: 365,
          date: '2026-07-15',
        },
      };
      const result = service.buildRenderSpec('CurrencyController_convert', JSON.stringify(data));

      expect(result).not.toBeNull();
      expect(result!.type).toBe(RenderSpecType.Currency);
      expect(result!.data).toEqual(expect.objectContaining({
        sourceCurrency: 'USD',
        targetCurrency: 'ILS',
        amount: 100,
        convertedAmount: 365,
        mode: 'convert',
      }));
    });

    it('builds a Currency render spec for rates', () => {
      const data = {
        success: true,
        message: 'ok',
        result: {
          base: 'USD',
          date: '2026-07-15',
          rates: { EUR: 0.92, ILS: 3.65 },
        },
      };
      const result = service.buildRenderSpec('CurrencyController_getRates', JSON.stringify(data));

      expect(result).not.toBeNull();
      expect(result!.type).toBe(RenderSpecType.Currency);
      expect(result!.data).toEqual(expect.objectContaining({
        sourceCurrency: 'USD',
        rates: { EUR: 0.92, ILS: 3.65 },
        mode: 'rates',
      }));
    });

    it('builds a UsersTable render spec', () => {
      const data = {
        data: [
          { id: 1, fullName: 'Admin', email: 'admin@test.com', role: 1, createdAt: '2026-01-01' },
          { id: 2, fullName: 'User', email: 'user@test.com', role: 2, createdAt: '2026-02-01' },
        ],
      };
      const result = service.buildRenderSpec('UsersController_list', JSON.stringify(data));

      expect(result).not.toBeNull();
      expect(result!.type).toBe(RenderSpecType.UsersTable);
      expect(result!.data).toEqual(expect.objectContaining({
        users: expect.arrayContaining([
          expect.objectContaining({ id: 1, fullName: 'Admin' }),
        ]),
      }));
    });

    it('builds a UserProfile render spec from /me endpoint', () => {
      const data = {
        data: { sub: 1, email: 'admin@test.com', role: 1, iat: 1000, exp: 2000 },
      };
      const result = service.buildRenderSpec('UsersController_me', JSON.stringify(data));

      expect(result).not.toBeNull();
      expect(result!.type).toBe(RenderSpecType.UserProfile);
      expect(result!.data).toEqual(expect.objectContaining({
        sub: 1,
        email: 'admin@test.com',
        role: 1,
      }));
    });

    it('builds a RoleChange render spec', () => {
      const data = {
        data: { id: 2, email: 'user@test.com', fullName: 'User', role: 1, updatedAt: '2026-07-15' },
      };
      const result = service.buildRenderSpec('UsersController_updateRole', JSON.stringify(data));

      expect(result).not.toBeNull();
      expect(result!.type).toBe(RenderSpecType.RoleChange);
    });

    it('builds a ChatSessions render spec', () => {
      const data = {
        data: [
          { id: 1, title: 'Test Chat', createdAt: '2026-07-15', updatedAt: '2026-07-15' },
        ],
      };
      const result = service.buildRenderSpec('AdminAgentController_getSessions', JSON.stringify(data));

      expect(result).not.toBeNull();
      expect(result!.type).toBe(RenderSpecType.ChatSessions);
    });

    it('builds a Transcript render spec', () => {
      const data = {
        data: [
          { role: 'user', content: 'Hello', createdAt: '2026-07-15T10:00:00Z' },
          { role: 'assistant', content: 'Hi there!', createdAt: '2026-07-15T10:00:01Z' },
        ],
        sessionId: 1,
      };
      const result = service.buildRenderSpec('AdminAgentController_getSessionMessages', JSON.stringify(data));

      expect(result).not.toBeNull();
      expect(result!.type).toBe(RenderSpecType.Transcript);
    });

    it('builds a SessionCreated render spec', () => {
      const data = {
        data: { id: 5, title: 'New Chat', createdAt: '2026-07-15', updatedAt: '2026-07-15' },
      };
      const result = service.buildRenderSpec('AdminAgentController_createSession', JSON.stringify(data));

      expect(result).not.toBeNull();
      expect(result!.type).toBe(RenderSpecType.SessionCreated);
    });

    it('builds an AnalyticsChart render spec', () => {
      const data = {
        chartType: 1,
        title: 'Users per day',
        summary: '100 total',
        maxValue: 50,
        series: [{ label: 'Mon', value: 30 }],
      };
      const result = service.buildRenderSpec('AnalyticsController_query', JSON.stringify(data));

      expect(result).not.toBeNull();
      expect(result!.type).toBe(RenderSpecType.AnalyticsChart);
    });

    it('builds a SystemStatus render spec', () => {
      const data = {
        totalUsers: 10,
        activeSessions: 3,
        swaggerStatus: 'ok',
        uptime: 999,
        nodeVersion: '22.0.0',
      };
      const result = service.buildRenderSpec('SystemController_getStatus', JSON.stringify(data));

      expect(result).not.toBeNull();
      expect(result!.type).toBe(RenderSpecType.SystemStatus);
    });

    it('builds a DatabaseStorage render spec', () => {
      const data = {
        databaseName: 'testdb',
        tableCount: 5,
        totalRows: 1000,
        totalSizeFormatted: '10 MB',
        tables: [
          { tableName: 'users', rowCount: 100, dataSizeFormatted: '2 KB', indexSizeFormatted: '1 KB', totalSizeFormatted: '3 KB', percentOfDatabase: 30, totalSizeBytes: 3000 },
        ],
      };
      const result = service.buildRenderSpec('DatabaseMonitorController_getStorage', JSON.stringify(data));

      expect(result).not.toBeNull();
      expect(result!.type).toBe(RenderSpecType.DatabaseStorage);
    });

    it('builds an LlmTestResults render spec', () => {
      const data = {
        data: [
          { model: 'gpt-4', provider: 'openai', status: 'ok', latencyMs: 500 },
        ],
      };
      const result = service.buildRenderSpec('LlmController_testModel', JSON.stringify(data));

      expect(result).not.toBeNull();
      expect(result!.type).toBe(RenderSpecType.LlmTestResults);
    });

    it('accepts pre-parsed objects', () => {
      const data = {
        success: true,
        result: {
          tempC: 28,
          humidity: '45',
          description: 'Clear',
        },
      };
      const result = service.buildRenderSpec('WeatherController_getWeather', data);

      expect(result).not.toBeNull();
      expect(result!.type).toBe(RenderSpecType.WeatherCurrent);
    });

    it('returns null gracefully on unexpected errors', () => {
      const result = service.buildRenderSpec('WeatherController_getWeather', null);
      expect(result).toBeNull();
    });
  });
});
