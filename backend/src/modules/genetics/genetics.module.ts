import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Genetics } from './entities/genetics.entity';
import { GeneticsService } from './genetics.service';
import { GeneticsController } from './genetics.controller';
import { LlmModule } from '../llm/llm.module';
import { WebSearchModule } from '../web-search/web-search.module';
import { CannlyticsModule } from '../cannlytics/cannlytics.module';

@Module({
    imports: [TypeOrmModule.forFeature([Genetics]), LlmModule, WebSearchModule, CannlyticsModule],
    controllers: [GeneticsController],
    providers: [GeneticsService],
    exports: [GeneticsService],
})
export class GeneticsModule {}
