import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { AdminAgentController } from './admin-agent.controller';
import { AdminAgent } from './admin-agent.service';
import { LlmService } from './llm.service';
import { UsersModule } from '../users/users.module';
import { AuthModule } from '../auth/auth.module';
import { ChatMessage } from './entities/chat-message.entity';
import { SwaggerToolsParser } from './swagger-tools.parser';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([User, ChatMessage]),
    UsersModule,
    AuthModule, // הוספת ייבוא אבטחה לצורך יצירת טוקני מערכת לסוכן
  ],
  controllers: [AdminAgentController],
  providers: [AdminAgent, LlmService, SwaggerToolsParser],
})
export class AdminAgentModule {}