import { Injectable } from '@nestjs/common';
import { ServiceResultContainer } from '../../core/models/service-result-container.model';
import { LlmModelGroupDto } from './dto/llm-model-group.dto';
import { LlmProviderDto } from './dto/llm-provider.dto';
import { LlmStatusDto } from './dto/llm-status.dto';
import { LlmClientService } from './services/llm-client.service';
import { LlmHealthService } from './services/llm-health.service';
import { LlmModelCatalogService } from './services/llm-model-catalog.service';
import { LlmProviderConfigService } from './services/llm-provider-config.service';
import { LlmModelTestResult, LlmProviderKey, LlmRequest, LlmResponse, LlmRuntimeSelection } from './types/llm.types';

@Injectable()
export class LlmService {
  constructor(
    private readonly providerConfig: LlmProviderConfigService,
    private readonly modelCatalog: LlmModelCatalogService,
    private readonly client: LlmClientService,
    private readonly health: LlmHealthService,
  ) {}

  getProviders(): Promise<ServiceResultContainer<LlmProviderDto[]>> {
    return this.modelCatalog.getProviders();
  }

  getModelOptions(): Promise<ServiceResultContainer<LlmModelGroupDto[]>> {
    return this.modelCatalog.getModelOptions();
  }

  async getStatus(): Promise<ServiceResultContainer<LlmStatusDto>> {
    const providersResult = await this.getProviders();

    return {
      success: true,
      message: 'LLM status retrieved successfully.',
      result: {
        activeProvider: this.providerConfig.getActiveProvider(),
        activeModel: this.providerConfig.getActiveModel(),
        providers: providersResult.result ?? [],
      },
    };
  }

  getRuntimeSelection(providerOverride?: LlmProviderKey, modelOverride?: string): LlmRuntimeSelection {
    return this.providerConfig.getRuntimeSelection(providerOverride, modelOverride);
  }

  generateResponse(llmRequest: LlmRequest): Promise<LlmResponse> {
    return this.client.generateResponse(llmRequest);
  }

  generateStream(llmRequest: LlmRequest): AsyncIterable<string> {
    return this.client.generateStream(llmRequest);
  }

  testLlm(
    provider: LlmProviderKey,
    model: string,
    prompt: string,
    systemContext: string,
  ): Promise<ServiceResultContainer<{ provider: LlmProviderKey; model: string; available: boolean }>> {
    return this.health.testLlm(provider, model, prompt, systemContext);
  }

  testAllModels(): Promise<ServiceResultContainer<LlmModelTestResult[]>> {
    return this.health.testAllModels();
  }
}
