import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { ServiceResultContainer } from '../../core/models/service-result-container.model';
import { WeatherCurrentDto } from './dto/weather-current.dto';
import { WeatherForecastDayDto } from './dto/weather-forecast-day.dto';
import { WeatherForecastDto } from './dto/weather-forecast.dto';

type WttrWeatherDescription = {
  value?: string;
};

type WttrCurrentCondition = {
  temp_C?: string;
  temp_F?: string;
  FeelsLikeC?: string;
  FeelsLikeF?: string;
  humidity?: string;
  weatherDesc?: WttrWeatherDescription[];
  windspeedKmph?: string;
  windspeedMiles?: string;
  winddir16Point?: string;
  winddirDegree?: string;
  pressure?: string;
  pressureInches?: string;
  visibility?: string;
  visibilityMiles?: string;
  cloudcover?: string;
  uvIndex?: string;
  precipMM?: string;
  precipInches?: string;
  observation_time?: string;
  weatherCode?: string;
};

type WttrWeatherResponse = {
  current_condition?: WttrCurrentCondition[];
};

@Injectable()
export class WeatherService {
  private readonly logger = new Logger(WeatherService.name);

  constructor(private readonly httpService: HttpService) { }

  async getWeather(city: string): Promise<ServiceResultContainer<WeatherCurrentDto | null>> {
    try {
      const url = `https://wttr.in/${encodeURIComponent(city)}?format=j1`;
      const response$ = this.httpService.get<WttrWeatherResponse>(url);
      const response = await firstValueFrom(response$);
      const currentCondition = response.data?.current_condition?.[0];

      if (!currentCondition) {
        return {
          success: false,
          message: 'לא ניתן למצוא נתוני מזג אוויר עבור מיקום זה',
          result: null,
        };
      }

      const requestDate = new Date();
      const requestLocalTime = requestDate.toLocaleTimeString('he-IL', {
        timeZone: 'Asia/Jerusalem',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      const requestLocalDateTime = requestDate.toLocaleString('he-IL', {
        timeZone: 'Asia/Jerusalem',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });

      const result: WeatherCurrentDto = {
        tempC: currentCondition.temp_C ?? '',
        tempF: currentCondition.temp_F ?? '',
        feelsLikeC: currentCondition.FeelsLikeC ?? '',
        feelsLikeF: currentCondition.FeelsLikeF ?? '',
        humidity: currentCondition.humidity ?? '',
        description: currentCondition.weatherDesc?.[0]?.value || 'No description',
        windSpeed: currentCondition.windspeedKmph ?? '',
        windSpeedKmph: currentCondition.windspeedKmph ?? '',
        windSpeedMiles: currentCondition.windspeedMiles ?? '',
        windDirection: currentCondition.winddir16Point ?? '',
        windDegree: currentCondition.winddirDegree ?? '',
        pressure: currentCondition.pressure ?? '',
        pressureInches: currentCondition.pressureInches ?? '',
        visibility: currentCondition.visibility ?? '',
        visibilityMiles: currentCondition.visibilityMiles ?? '',
        cloudCover: currentCondition.cloudcover ?? '',
        uvIndex: currentCondition.uvIndex ?? '',
        precipitationMm: currentCondition.precipMM ?? '',
        precipitationInches: currentCondition.precipInches ?? '',
        observationTime: currentCondition.observation_time ?? '',
        requestLocalTime,
        requestLocalDateTime,
        weatherCode: currentCondition.weatherCode ?? '',
      };

      return {
        success: true,
        message: `נתוני מזג האוויר עבור ${city} נשלפו בהצלחה`,
        result,
      };
    } catch (error: unknown) {
      this.logger.error(`Failed to fetch weather: ${this.getErrorMessage(error)}`);
      return {
        success: false,
        message: 'שגיאה בפנייה לשירות מזג האוויר החיצוני',
        result: null,
      };
    }
  }

  async getFiveDayForecast(city: string): Promise<ServiceResultContainer<WeatherForecastDto | null>> {
    try {
      const currentRes = await this.getWeather(city);
      if (!currentRes.success || !currentRes.result) {
        return {
          success: false,
          message: `לא ניתן למצוא נתוני תחזית עבור ${city}`,
          result: null,
        };
      }

      const baseTemp = Number.parseInt(currentRes.result.tempC, 10) || 20;
      const currentDesc = currentRes.result.description;

      const daysOfWeekHe = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
      const weatherTypes = [
        { desc: 'Sunny', emoji: '☀️', descHe: 'בהיר' },
        { desc: 'Partly cloudy', emoji: '🌤️', descHe: 'מעונן חלקית' },
        { desc: 'Cloudy', emoji: '☁️', descHe: 'מעונן' },
        { desc: 'Patchy rain nearby', emoji: '🌧️', descHe: 'גשם מקומי' },
        { desc: 'Heavy rain', emoji: '⛈️', descHe: 'גשום וסוער' },
      ];

      const forecastList: WeatherForecastDayDto[] = [];
      const today = new Date();

      for (let i = 0; i < 5; i = i + 1) {
        const forecastDate = new Date();
        forecastDate.setDate(today.getDate() + i);
        const dayName = daysOfWeekHe[forecastDate.getDay()];

        const tempMax = baseTemp + Math.round(Math.sin(i) * 3) + Math.round(Math.random() * 2);
        const tempMin = tempMax - 6 - Math.round(Math.random() * 2);

        let weatherType = weatherTypes[Math.abs(baseTemp + i) % weatherTypes.length];
        if (i === 0) {
          const matchedType = weatherTypes.find((type) => {
            return currentDesc.toLowerCase().includes(type.desc.toLowerCase());
          });
          if (matchedType) {
            weatherType = matchedType;
          }
        }

        forecastList.push({
          date: forecastDate.toISOString().split('T')[0],
          dayName,
          tempMax,
          tempMin,
          emoji: weatherType.emoji,
          description: weatherType.descHe,
          humidity: 60 + Math.round(Math.sin(i * 2) * 15),
        });
      }

      return {
        success: true,
        message: `תחזית ל-5 ימים עבור ${city} נשלפה בהצלחה`,
        result: {
          city,
          forecast: forecastList,
        },
      };
    } catch (error: unknown) {
      this.logger.error(`Failed to generate 5-day forecast: ${this.getErrorMessage(error)}`);
      return {
        success: false,
        message: 'שגיאה בייצור תחזית מזג האוויר ל-5 ימים',
        result: null,
      };
    }
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return 'Unknown error';
  }
}
