import { z } from 'zod';

export enum RenderSpecType {
  WeatherCurrent = 'weather-current',
  WeatherForecast = 'weather-forecast',
  Currency = 'currency',
  UserProfile = 'user-profile',
  UsersTable = 'users-table',
  RoleChange = 'role-change',
  ChatSessions = 'chat-sessions',
  Transcript = 'transcript',
  SessionCreated = 'session-created',
  AnalyticsChart = 'analytics-chart',
  SystemStatus = 'system-status',
  DatabaseStorage = 'database-storage',
  LlmTestResults = 'llm-test-results',
  DeleteConfirm = 'delete-confirm',
  RegisterForm = 'register-form',
  AgnesImage = 'agnes-image',
  AgnesVideo = 'agnes-video',
}

const renderSpecDiscriminatedSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal(RenderSpecType.WeatherCurrent), data: z.record(z.string(), z.unknown()) }),
  z.object({ type: z.literal(RenderSpecType.WeatherForecast), data: z.record(z.string(), z.unknown()) }),
  z.object({ type: z.literal(RenderSpecType.Currency), data: z.record(z.string(), z.unknown()) }),
  z.object({ type: z.literal(RenderSpecType.UserProfile), data: z.record(z.string(), z.unknown()) }),
  z.object({ type: z.literal(RenderSpecType.UsersTable), data: z.record(z.string(), z.unknown()) }),
  z.object({ type: z.literal(RenderSpecType.RoleChange), data: z.record(z.string(), z.unknown()) }),
  z.object({ type: z.literal(RenderSpecType.ChatSessions), data: z.record(z.string(), z.unknown()) }),
  z.object({ type: z.literal(RenderSpecType.Transcript), data: z.record(z.string(), z.unknown()) }),
  z.object({ type: z.literal(RenderSpecType.SessionCreated), data: z.record(z.string(), z.unknown()) }),
  z.object({ type: z.literal(RenderSpecType.AnalyticsChart), data: z.record(z.string(), z.unknown()) }),
  z.object({ type: z.literal(RenderSpecType.SystemStatus), data: z.record(z.string(), z.unknown()) }),
  z.object({ type: z.literal(RenderSpecType.DatabaseStorage), data: z.record(z.string(), z.unknown()) }),
  z.object({ type: z.literal(RenderSpecType.LlmTestResults), data: z.record(z.string(), z.unknown()) }),
  z.object({ type: z.literal(RenderSpecType.DeleteConfirm), data: z.record(z.string(), z.unknown()) }),
  z.object({ type: z.literal(RenderSpecType.RegisterForm), data: z.record(z.string(), z.unknown()) }),
  z.object({ type: z.literal(RenderSpecType.AgnesImage), data: z.record(z.string(), z.unknown()) }),
  z.object({ type: z.literal(RenderSpecType.AgnesVideo), data: z.record(z.string(), z.unknown()) }),
]);

export type RenderSpec = z.infer<typeof renderSpecDiscriminatedSchema>;

export { renderSpecDiscriminatedSchema };
