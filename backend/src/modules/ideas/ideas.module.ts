import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { LlmModule } from '../llm/llm.module';
import { WebSearchModule } from '../web-search/web-search.module';
import { UsersModule } from '../users/users.module';
import { LlmProviderModule } from '../llm-provider/llm-provider.module';
import { IdeasService } from './ideas.service';
import { IdeasController } from './ideas.controller';
import { IdeasTasksService } from './ideas-tasks.service';
import { TelegramNotifyService } from './telegram-notify.service';
import { SavedIdeaSession } from './entities/saved-idea-session.entity';
import { SavedIdea } from './entities/saved-idea.entity';

@Module({
  imports: [
    HttpModule,
    LlmModule,
    WebSearchModule,
    UsersModule,
    LlmProviderModule,
    TypeOrmModule.forFeature([SavedIdeaSession, SavedIdea]),
  ],
  controllers: [IdeasController],
  providers: [IdeasService, IdeasTasksService, TelegramNotifyService],
  exports: [IdeasService],
})
export class IdeasModule {}
