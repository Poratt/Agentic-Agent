import { Injectable } from '@nestjs/common';
import { ServiceResultContainer } from '../../../core/models/service-result-container.model';
import { LLM_STATIC_MODEL_GROUPS } from '../constants/llm-model-catalog.constant';
import { LlmProviderRegistryService } from './llm-provider-registry.service';
// Phase 5 – health service now uses the provider registry to discover active models
import { LlmModelCheckTarget, LlmModelTestResult, LlmProviderKey } from '../types/llm.types';
import { LlmClientService } from './llm-client.service';
import { LlmModelCatalogService } from './llm-model-catalog.service';
import { LlmProviderConfigService } from './llm-provider-config.service';

@Injectable()
export class LlmHealthService {
  constructor(
    private readonly client: LlmClientService,
    private readonly providerConfig: LlmProviderConfigService,
    private readonly modelCatalog: LlmModelCatalogService,
    private readonly providerRegistry: LlmProviderRegistryService,
  ) {}

  async testLlm(
    provider: LlmProviderKey,
    model: string,
    prompt: string,
    systemContext: string,
  ): Promise<ServiceResultContainer<{ provider: LlmProviderKey; model: string; available: boolean }>> {
    const runtimeSelection = this.providerConfig.getRuntimeSelection(provider, model);
    const response = await this.client.generateResponse({
      prompt: prompt || 'Hello',
      systemContext: systemContext || 'You are a helpful assistant.',
      providerOverride: provider,
      modelOverride: model,
    });

    return {
      success: true,
      message: 'LLM check completed successfully.',
      result: {
        provider: runtimeSelection.provider,
        model: runtimeSelection.model,
        available: Boolean(response.content || response.toolCalls?.length),
      },
    };
  }

  async testAllModels(): Promise<ServiceResultContainer<LlmModelTestResult[]>> {
    const models = await this.getModelCheckTargets();

    const promises = models.map(async (model) => {
      try {
        const check = await this.testLlm(
          model.provider,
          model.name,
          'Hello! This is a connectivity test. Please respond with "OK"',
          'You are a helpful assistant.',
        );
        return {
          name: model.name,
          provider: model.provider,
          available: check.result.available,
        };
      } catch (e) {
        return {
          name: model.name,
          provider: model.provider,
          available: false,
        };
      }
    });

    const results = await Promise.all(promises);

    return {
      success: true,
      message: 'All LLM models tested successfully.',
      result: results,
    };
  }

  private async getModelCheckTargets(): Promise<LlmModelCheckTarget[]> {
    const models: LlmModelCheckTarget[] = [];
    const activeProvider = this.providerConfig.getActiveProvider();
    const activeModel = this.providerConfig.getActiveModel();

    for (const provider of this.providerConfig.getProviders()) {
      const config = await this.providerConfig.getProviderConfig(provider);
      if (!this.providerConfig.isProviderConfigured(config)) {
        continue;
      }

      if (provider !== 'ollama') {
        // Use DB‑backed models via the provider registry
        const providerEntity = await this.providerRegistry.findProviderByKey(provider);
        if (!providerEntity) {
          // No DB entry – skip (should not happen for configured providers)
          continue;
        }
        const dbModels = await this.providerRegistry.findModelsByProvider(providerEntity.id);
        dbModels.forEach((model) => {
          models.push({
            provider,
            name: model.name,
            active: provider === activeProvider && model.name === activeModel,
          });
        });
        continue;
      }
      if (provider === 'ollama') {
        const ollamaModels = await this.modelCatalog.getSafeLocalOllamaModels();

        ollamaModels.forEach((model) => {
          models.push({
            provider,
            name: model.name,
            active: provider === activeProvider && model.name === activeModel,
            sizeGb: typeof model.size === 'number' ? Number((model.size / (1024 * 1024 * 1024)).toFixed(2)) : undefined,
            family: model.details?.family,
          });
        });

        continue;
      }
    }

    return models;
  }
}
