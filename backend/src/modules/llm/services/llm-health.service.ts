import { Injectable } from '@nestjs/common';
import { ServiceResultContainer } from '../../../core/models/service-result-container.model';
import { LlmModelCheckTarget, LlmModelTestResult, LlmProvider } from '../types/llm.types';
import { LlmClientService } from './llm-client.service';
import { LlmProviderConfigService } from './llm-provider-config.service';
import { LlmProviderService } from '../../llm-provider/llm-provider.service';

@Injectable()
export class LlmHealthService {
  constructor(
    private readonly client: LlmClientService,
    private readonly providerConfig: LlmProviderConfigService,
    private readonly dbProviderService: LlmProviderService,
  ) { }

  async testLlm(
    provider: LlmProvider,
    model: string,
    prompt: string,
    systemContext: string,
  ): Promise<ServiceResultContainer<{ provider: LlmProvider; model: string; available: boolean }>> {
    const runtimeSelection = this.providerConfig.getRuntimeSelection(provider, model);

    const startTime = performance.now();

    let status: 'success' | 'error' | 'timeout' = 'success';
    let errorMessage: string | null = null;
    let available = false;

    try {
      const response = await this.client.generateResponse({
        prompt: prompt || 'Hello',
        systemContext: systemContext || 'You are a helpful assistant.',
        providerOverride: provider,
        modelOverride: model,
      });

      available = Boolean(response.content || response.toolCalls?.length);

      if (!available) {
        status = 'error';
        errorMessage = 'Model returned empty response';
      }
    } catch (error: unknown) {
      available = false;
      errorMessage = error instanceof Error ? error.message : 'Unknown connection error';

      // זיהוי שגיאות Timeout לפי תוכן השגיאה
      if (errorMessage.toLowerCase().includes('timeout') || errorMessage.toLowerCase().includes('aborted')) {
        status = 'timeout';
      } else {
        status = 'error';
      }
    }

    const endTime = performance.now();
    const responseTimeMs = Math.round(endTime - startTime);

    // 🚀 שמירת התוצאה ב-DB 🚀
    try {
      const dbModel = await this.dbProviderService.findModelByKey(model);
      if (dbModel) {
        await this.dbProviderService.saveTestResult(
          dbModel.id,
          responseTimeMs,
          status,
          errorMessage,
        );
      }
    } catch (dbError) {
      console.error('Failed to save LLM test result to database:', dbError);
    }

    return {
      success: status === 'success',
      message: status === 'success' ? 'LLM check completed successfully.' : `LLM check failed: ${errorMessage}`,
      result: {
        provider: runtimeSelection.provider,
        model: runtimeSelection.model,
        available,
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

    const dbProvidersResult = await this.dbProviderService.findProviders();

    if (dbProvidersResult.success && dbProvidersResult.result) {
      for (const provider of dbProvidersResult.result) {
        if (!provider.active) continue;

        for (const model of provider.models || []) {
          if (!model.active) continue;

          models.push({
            provider: provider.key as any,
            name: model.key,
            active: provider.key === activeProvider && model.key === activeModel,
          });
        }
      }
    }

    return models;
  }
}