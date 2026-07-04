import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Terpene } from './entities/terpene.entity';
import { TerpeneService } from './terpene.service';
import { TerpeneController } from './terpene.controller';
import { LlmModule } from '../llm/llm.module';
import { WebSearchModule } from '../web-search/web-search.module';

@Module({
    imports: [TypeOrmModule.forFeature([Terpene]), LlmModule, WebSearchModule],
    controllers: [TerpeneController],
    providers: [TerpeneService],
    exports: [TerpeneService],
})
export class TerpeneModule {}