import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { AdminAgentController } from './admin-agent.controller';
import { AdminAgentService } from './admin-agent.service';
import { LlmService } from './llm.service';
import { UsersModule } from '../users/users.module';
import { AuthModule } from '../auth/auth.module';
import { ChatMessage } from './entities/chat-message.entity';
import { ChatSession } from './entities/chat-session.entity';
import { SwaggerToolsParser } from './services/swagger-tools.parser';
import { AgentSessionService } from './services/agent-session.service';
import { AgentToolExecutorService } from './services/agent-tool-executor.service';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([User, ChatMessage, ChatSession]),
    UsersModule,
    AuthModule,
  ],
  controllers: [AdminAgentController],
  providers: [
    AdminAgentService,
    LlmService,
    SwaggerToolsParser,
    AgentSessionService,
    AgentToolExecutorService,
  ],
  exports: [AdminAgentService],
})
export class AdminAgentModule {}