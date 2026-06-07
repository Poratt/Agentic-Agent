// FILE: src/modules/explorer/explorer.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as fs from 'fs';
import { User } from '../users/entities/user.entity';
import { ChatSession } from '../admin-agent/entities/chat-session.entity';
import { ServiceResultContainer } from '../../core/models/service-result-container.model';
import { SystemStatus } from '../../core/interfaces/system-status.interface';

@Injectable()
export class ExplorerService {
  private readonly logger = new Logger(ExplorerService.name);

  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    @InjectRepository(ChatSession)
    private readonly chatSessionRepo: Repository<ChatSession>,
    private readonly httpService: HttpService,
  ) { }

  async getSystemStatus(): Promise<ServiceResultContainer<SystemStatus>> {
    const totalUsersCount = await this.usersRepo.count();
    const activeSessionsCount = await this.chatSessionRepo.count();
    const swaggerExists = fs.existsSync('./swagger-spec.json');

    const status: SystemStatus = {
      totalUsers: totalUsersCount,
      activeSessions: activeSessionsCount,
      isSwaggerUpToDate: swaggerExists,
    };

    return {
      success: true,
      message: 'מצב המערכת הדינמי נשלף בהצלחה',
      result: status,
    };
  }

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


}