import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LlmProviderKey, LlmProviderConfig, LlmRuntimeSelection } from '../types/llm.types';
import { LlmProviderRegistryService } from './llm-provider-registry.service';

const LLM_PROVIDERS: LlmProviderKey[] = ['openrouter', 'nvidia', 'ollama'];

/**
 * Centralizes LLM provider environment configuration and runtime model selection.
 */
@Injectable()
export class LlmProviderConfigService {
  private readonly activeProvider: LlmProviderKey;
  private activeModel: string = '';

  constructor(
    private readonly configService: ConfigService,
    private readonly registry: LlmProviderRegistryService,
  ) {
    const provider = this.configService.get<LlmProviderKey>('AI_PROVIDER');
    if (!provider) {
      throw new Error('Missing AI_PROVIDER environment variable');
    }
    this.activeProvider = provider;

    // Note: getProviderConfig is now async, so we can't use it in the constructor to set activeModel.
    // We'll initialize activeModel lazily or via a separate init method if needed.
  }

  private async initializeActiveModel(): Promise<void> {
    const config = await this.getProviderConfig(this.activeProvider);
    this.activeModel = config.model;
  }


  /**
   * Returns the provider selected by the required AI_PROVIDER environment variable.
   *
   * @returns Active provider id used when a request does not supply an override.
   */
  getActiveProvider(): LlmProviderKey {
    return this.activeProvider;
  }

  /**
   * Returns the active provider's configured model.
   *
   * @returns Model name from the active provider configuration.
   */
  getActiveModel(): string {
    return this.activeModel;
  }

  /**
   * Reads API key, base URL, and model configuration for a provider.
   *
   * @param provider Provider id whose environment-backed config should be returned.
   * @returns Provider configuration with the same defaults used by the legacy LlmService.
   */
  async getProviderConfig(providerKey: string): Promise<LlmProviderConfig> {
    const registry = this.registry;
    const dbProvider = await registry.findProviderByKey(providerKey);

    if (dbProvider?.active) {
      return {
        id: providerKey as LlmProviderKey,
        baseUrl: dbProvider.baseUrl,
        apiKey: await registry.getDecryptedApiKey(dbProvider.id),
        model: dbProvider.defaultModelId
          ? (await registry.findModelsByProvider(dbProvider.id))
              .find(m => m.id === dbProvider.defaultModelId)?.name || ''
          : '',
      };
    }

    return this.getEnvFallback(providerKey as LlmProviderKey);
  }


  private getEnvFallback(provider: LlmProviderKey): LlmProviderConfig {
    if (provider === 'openrouter') {
      return {
        id: provider,
        apiKey: this.configService.get<string>('OPENROUTER_API_KEY') ?? '',
        baseUrl: this.configService.get<string>('OPENROUTER_BASE_URL') ?? '',
        model: this.configService.get<string>('OPENROUTER_MODEL') ?? '',
      };
    }

    if (provider === 'nvidia') {
      return {
        id: provider,
        apiKey: this.configService.get<string>('NVIDIA_API_KEY') ?? '',
        baseUrl: this.configService.get<string>('NVIDIA_BASE_URL') ?? '',
        model: this.configService.get<string>('NVIDIA_MODEL') ?? '',
      };
    }

    return {
      id: provider,
      apiKey: this.configService.get<string>('OLLAMA_API_KEY') ?? 'ollama',
      baseUrl: this.configService.get<string>('OLLAMA_BASE_URL') ?? 'http://localhost:11434/v1',
      model: this.configService.get<string>('OLLAMA_MODEL') ?? 'llama3',
    };
  }

  /**
   * Returns default headers for a provider (e.g., OpenRouter referer/title).
   *
   * @param provider Provider id used to determine whether OpenRouter headers are required.
   * @returns OpenRouter referer/title headers, or an empty object for all other providers.
   */
  getDefaultHeaders(provider: LlmProviderKey): Record<string, string> {
    if (provider !== 'openrouter') {
      return {};
    }

    return { 'HTTP-Referer': 'http://localhost:3000', 'X-Title': 'NestJS AI Agent' };
  }

  /**
   * Checks whether a provider has all required connection values.
   *
   * @param config Provider configuration to validate.
   * @returns True when API key, base URL, and model are all non-empty.
   */
  isProviderConfigured(config: LlmProviderConfig): boolean {
    return Boolean(config.apiKey && config.baseUrl && config.model);
  }

  /**
   * Resolves the provider and model for one runtime request.
   *
   * @param providerOverride Optional request-level provider override.
   * @param modelOverride Optional request-level model override.
   * @returns Provider/model pair used for the request.
   */
  getRuntimeSelection(providerOverride?: LlmProviderKey, modelOverride?: string): LlmRuntimeSelection {
    return {
      provider: providerOverride ?? this.activeProvider,
      model: modelOverride ?? this.activeModel,
    };
  }

  /**
   * Returns the configured provider ids exposed by the legacy LLM provider list.
   *
   * @returns Supported provider ids in display/check order.
   */
  getProviders(): LlmProviderKey[] {
    return LLM_PROVIDERS;
  }
}
