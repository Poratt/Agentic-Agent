import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as fs from 'fs';
import { Repository } from 'typeorm';
import { ChatSession } from '../admin-agent/entities/chat-session.entity';
import { User } from '../users/entities/user.entity';
import { ServiceResultContainer } from '../../core/models/service-result-container.model';
import { SystemStatusDto } from './dto/system-status.dto';

@Injectable()
export class SystemService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    @InjectRepository(ChatSession)
    private readonly chatSessionRepo: Repository<ChatSession>,
  ) {}

  async getSystemStatus(): Promise<ServiceResultContainer<SystemStatusDto>> {
    const totalUsersCount = await this.usersRepo.count();
    const activeSessionsCount = await this.chatSessionRepo.count();
    const swaggerExists = fs.existsSync('./swagger-spec.json');

    const status: SystemStatusDto = {
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
}
