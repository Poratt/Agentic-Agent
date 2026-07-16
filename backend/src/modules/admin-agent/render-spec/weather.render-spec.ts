import { z } from 'zod';
import { RenderSpecType } from './render-spec.interface';

const WeatherCurrentRenderDataSchema = z.object({
  location: z.string().optional(),
  tempC: z.number().optional(),
  feelsLikeC: z.number().optional(),
  tempF: z.number().optional(),
  feelsLikeF: z.number().optional(),
  humidity: z.number().optional(),
  windSpeedKmph: z.number().optional(),
  windDirection: z.string().optional(),
  uvIndex: z.number().optional(),
  cloudCover: z.number().optional(),
  precipitationMm: z.number().optional(),
  pressure: z.number().optional(),
  visibility: z.number().optional(),
  weatherDesc: z.string().optional(),
  weatherEmoji: z.string().optional(),
  observationTime: z.string().optional(),
  requestLocalTime: z.string().optional(),
});

export type WeatherCurrentRenderData = z.infer<typeof WeatherCurrentRenderDataSchema>;

const WeatherForecastRenderDataSchema = z.object({
  location: z.string().optional(),
  forecast: z.array(z.object({
    date: z.string().optional(),
    dayName: z.string().optional(),
    maxTempC: z.number().optional(),
    minTempC: z.number().optional(),
    humidity: z.number().optional(),
    weatherDesc: z.string().optional(),
    weatherEmoji: z.string().optional(),
  })).optional(),
});

export type WeatherForecastRenderData = z.infer<typeof WeatherForecastRenderDataSchema>;

export const WeatherCurrentRenderSpecSchema = z.object({
  type: z.literal(RenderSpecType.WeatherCurrent),
  data: WeatherCurrentRenderDataSchema,
});

export const WeatherForecastRenderSpecSchema = z.object({
  type: z.literal(RenderSpecType.WeatherForecast),
  data: WeatherForecastRenderDataSchema,
});
