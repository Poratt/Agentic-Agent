import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LlmModule } from '../llm/llm.module';
import { WebSearchModule } from '../web-search/web-search.module';
import { UsersModule } from '../users/users.module';
import { LlmProviderModule } from '../llm-provider/llm-provider.module';
import { IdeasService } from './ideas.service';
import { IdeasController } from './ideas.controller';
import { IdeasTasksService } from './ideas-tasks.service';
import { SavedIdeaSession } from './entities/saved-idea-session.entity';
import { SavedIdea } from './entities/saved-idea.entity';

@Module({
  imports: [
    LlmModule,
    WebSearchModule,
    UsersModule,
    LlmProviderModule,
    TypeOrmModule.forFeature([SavedIdeaSession, SavedIdea]),
  ],
  controllers: [IdeasController],
  providers: [IdeasService, IdeasTasksService],
  exports: [IdeasService],
})
export class IdeasModule {}
