import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LlmProviderRegistryService } from './llm-provider-registry.service';
import { LlmProviderConfigService } from './llm-provider-config.service';
import { LlmProvider } from '../entities/llm-provider.entity';
import { LlmModel } from '../entities/llm-model.entity';
import { EncryptionService } from './encryption.service';
import { CreateProviderDto } from '../dto/llm-provider.dto';
import { CreateModelDto } from '../dto/llm-model.dto';
import { LLM_STATIC_MODEL_GROUPS } from '../constants/llm-model-catalog.constant';

/**
 * Seed service that runs on module init to ensure that any providers/models defined in
 * environment variables or static model groups exist in the database.
 *
 * - Never overwrites existing records – respects admin edits.
 * - Logs actions at debug/info level.
 */
@Injectable()
export class LlmProviderSeedService implements OnModuleInit {
  private readonly logger = new Logger(LlmProviderSeedService.name);

  constructor(
    private readonly registry: LlmProviderRegistryService,
    private readonly config: ConfigService,
    private readonly encryption: EncryptionService,
  ) { }

  async onModuleInit(): Promise<void> {
    await this.seedProviders();
    await this.seedModels();
  }

  /** Seed providers from environment configuration if they do not already exist. */
  private async seedProviders(): Promise<void> {
    // Example env vars: LLM_PROVIDER_OPENROUTER_KEY, LLM_PROVIDER_OPENROUTER_LABEL, etc.
    const providers = [
      { key: 'openrouter', envPrefix: 'OPENROUTER' },
      { key: 'nvidia', envPrefix: 'NVIDIA' },
      { key: 'ollama', envPrefix: 'OLLAMA' },
    ];

    for (const { key, envPrefix } of providers) {
      // Basic required vars – if missing, skip this provider.
      const label = this.config.get<string>(`LLM_PROVIDER_${envPrefix}_LABEL`);
      const baseUrl = this.config.get<string>(`LLM_PROVIDER_${envPrefix}_BASE_URL`);
      if (!label || !baseUrl) {
        this.logger.debug(`Skipping seed for provider ${key} – missing env vars.`);
        continue;
      }

      const existing = await this.registry.findProviderByKey(key);
      if (existing) {
        this.logger.debug(`Provider ${key} already exists – seed skipped.`);
        continue;
      }

      const apiKey = this.config.get<string>(`LLM_PROVIDER_${envPrefix}_API_KEY`);
      const dto: CreateProviderDto = {
        key,
        label,
        baseUrl,
        apiKey,
        // defaultModelId omitted – will be null by DB default
        active: true,
        rateLimitFlag: false,
      };
      await this.registry.createProvider(dto);
      this.logger.log(`Seeded new provider ${key}.`);
    }
  }

  /** Seed static models for each provider based on LLM_STATIC_MODEL_GROUPS. */
  private async seedModels(): Promise<void> {
    for (const group of LLM_STATIC_MODEL_GROUPS) {
      const providerKey = group.label as string; // label matches provider key in our design.
      const provider = await this.registry.findProviderByKey(providerKey);
      if (!provider) {
        this.logger.debug(`Provider ${providerKey} not found – cannot seed models.`);
        continue;
      }

      for (const item of group.items) {
        const exists = await this.registry.findModelsByProvider(provider.id).then((models) =>
          models.some((m) => m.name === item.value),
        );
        if (exists) {
          this.logger.debug(`Model ${item.value} for provider ${providerKey} already exists – skip.`);
          continue;
        }
        const dto: CreateModelDto = {
          name: item.value,
          label: item.label,
          active: true,
          supportsStreaming: true,
          supportsTools: false,
          sortOrder: 0,
        };
        await this.registry.createModel(provider.id, dto);
        this.logger.log(`Seeded model ${item.value} for provider ${providerKey}.`);
      }
    }
  }
}
