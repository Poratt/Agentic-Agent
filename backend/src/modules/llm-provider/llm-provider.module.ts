import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LlmProviderController } from './llm-provider.controller';
import { LlmProviderService } from './llm-provider.service';
import { LlmProviderEntity } from './entities/llm-provider.entity';
import { LlmModelEntity } from './entities/llm-model.entity';
import { LlmModelTestResultEntity } from './entities/llm-model-test-results.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([LlmProviderEntity, LlmModelEntity, LlmModelTestResultEntity]),
  ],
  controllers: [LlmProviderController],
  providers: [LlmProviderService],
  exports: [LlmProviderService],
})
export class LlmProviderModule { }