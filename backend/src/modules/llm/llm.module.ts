import { Module } from '@nestjs/common';
import { LlmController } from './llm.controller';
import { LlmService } from './llm.service';
import { LlmClientService } from './services/llm-client.service';
import { LlmHealthService } from './services/llm-health.service';
import { LlmModelCatalogService } from './services/llm-model-catalog.service';
import { LlmProviderConfigService } from './services/llm-provider-config.service';

@Module({
  controllers: [LlmController],
  providers: [LlmService, LlmProviderConfigService, LlmClientService, LlmModelCatalogService, LlmHealthService],
  exports: [LlmService],
})
export class LlmModule {}
