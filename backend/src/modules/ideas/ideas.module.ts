import { Module } from '@nestjs/common';
import { LlmModule } from '../llm/llm.module';
import { WebSearchModule } from '../web-search/web-search.module';
import { IdeasService } from './ideas.service';
import { IdeasController } from './ideas.controller';

@Module({
  imports: [LlmModule, WebSearchModule],
  controllers: [IdeasController],
  providers: [IdeasService],
  exports: [IdeasService],
})
export class IdeasModule {}
