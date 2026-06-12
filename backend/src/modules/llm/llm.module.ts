import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LlmController } from './llm.controller';
import { LlmAdminController } from './llm-admin.controller';
import { LlmService } from './llm.service';
import { LlmClientService } from './services/llm-client.service';
import { LlmHealthService } from './services/llm-health.service';
import { LlmModelCatalogService } from './services/llm-model-catalog.service';
import { LlmProviderConfigService } from './services/llm-provider-config.service';
import { LlmProviderRegistryService } from './services/llm-provider-registry.service';
import { LlmProviderSeedService } from './services/llm-provider-seed.service';
import { EncryptionService } from './services/encryption.service';
import { LlmProvider } from './entities/llm-provider.entity';
import { LlmModel } from './entities/llm-model.entity';
import { LlmModelTestRun } from './entities/llm-model-test-run.entity';
import { LlmModelTestResult } from './entities/llm-model-test-result.entity';

@Module({
  imports: [TypeOrmModule.forFeature([LlmProvider, LlmModel, LlmModelTestRun, LlmModelTestResult])],
  controllers: [LlmController, LlmAdminController],
  providers: [
    LlmProviderSeedService,
    LlmService,
    LlmProviderConfigService,
    LlmProviderRegistryService,
    LlmClientService,
    LlmModelCatalogService,
    LlmHealthService,
    EncryptionService,
  ],
  exports: [LlmService],
})
export class LlmModule {}
