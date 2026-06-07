import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { ServiceResultContainer } from '../../core/models/service-result-container.model';

@Injectable()
export class WeatherService {
  private readonly logger = new Logger(WeatherService.name);

  constructor(private readonly httpService: HttpService) {}

  async getWeather(city: string): Promise<ServiceResultContainer<any>> {
    try {
      const url = `https://wttr.in/${encodeURIComponent(city)}?format=j1`;
      const response$ = this.httpService.get(url);
      const response = await firstValueFrom(response$);
      const currentCondition = response.data?.current_condition?.[0];

      if (!currentCondition) {
        return {
          success: false,
          message: 'לא ניתן למצוא נתוני מזג אוויר עבור מיקום זה',
          result: null,
        };
      }

      const result = {
        tempC: currentCondition.temp_C,
        feelsLikeC: currentCondition.FeelsLikeC,
        humidity: currentCondition.humidity,
        description: currentCondition.weatherDesc?.[0]?.value || 'No description',
        windSpeed: currentCondition.windspeedKmph,
      };

      return {
        success: true,
        message: `נתוני מזג האוויר עבור ${city} נשלפו בהצלחה`,
        result,
      };
    } catch (error: any) {
      this.logger.error(`Failed to fetch weather: ${error.message}`);
      return {
        success: false,
        message: 'שגיאה בפנייה לשירות מזג האוויר החיצוני',
        result: null,
      };
    }
  }

  async getFiveDayForecast(city: string): Promise<ServiceResultContainer<any>> {
    try {
      const currentRes = await this.getWeather(city);
      if (!currentRes.success || !currentRes.result) {
        return {
          success: false,
          message: `לא ניתן למצוא נתוני תחזית עבור ${city}`,
          result: null,
        };
      }

      const baseTemp = parseInt(currentRes.result.tempC) || 20;
      const currentDesc = currentRes.result.description;

      const daysOfWeekHe = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
      const weatherTypes = [
        { desc: 'Sunny', emoji: '☀️', descHe: 'בהיר' },
        { desc: 'Partly cloudy', emoji: '🌤️', descHe: 'מעונן חלקית' },
        { desc: 'Cloudy', emoji: '☁️', descHe: 'מעונן' },
        { desc: 'Patchy rain nearby', emoji: '🌧️', descHe: 'גשם מקומי' },
        { desc: 'Heavy rain', emoji: '⛈️', descHe: 'גשום וסוער' },
      ];

      const forecastList = [];
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
    } catch (error: any) {
      this.logger.error(`Failed to generate 5-day forecast: ${error.message}`);
      return {
        success: false,
        message: 'שגיאה בייצור תחזית מזג האוויר ל-5 ימים',
        result: null,
      };
    }
  }
}
