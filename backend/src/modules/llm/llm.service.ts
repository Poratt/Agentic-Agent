import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { ServiceResultContainer } from '../../core/models/service-result-container.model';
import { LLM_STATIC_MODEL_GROUPS } from './constants/llm-model-catalog.constant';
import { LlmModelGroupDto } from './dto/llm-model-group.dto';
import { LlmProviderDto } from './dto/llm-provider.dto';
import { LlmStatusDto } from './dto/llm-status.dto';
import {
  LlmProvider,
  LlmRequest,
  LlmResponse,
  LlmRuntimeSelection,
  LlmToolCall,
} from './types/llm.types';

type LlmProviderConfig = {
  id: LlmProvider;
  apiKey: string;
  baseUrl: string;
  model: string;
};

type OllamaModel = {
  name: string;
  size?: number;
  details?: {
    family?: string;
  };
};

type OllamaTagsResponse = {
  models?: OllamaModel[];
};

const LLM_PROVIDERS: LlmProvider[] = ['openrouter', 'nvidia', 'ollama'];
const MAX_RETRIES = 4;
const BASE_DELAY_MS = 1500;

@Injectable()
export class LlmService implements OnModuleInit {
  private readonly logger = new Logger(LlmService.name);
  private openai: OpenAI;
  private provider: LlmProvider = 'nvidia';
  private model?: string;
  private baseUrl?: string;
  private apiKey?: string;

  constructor(private readonly configService: ConfigService) {
    const provider = this.configService.get<LlmProvider>('AI_PROVIDER');
    if (!provider) {
      throw new Error('Missing AI_PROVIDER environment variable');
    }
    this.provider = provider;

    const providerConfig = this.getProviderConfig(this.provider);

    if (!providerConfig.apiKey) {
      throw new Error(`Missing API key for provider: ${this.provider}`);
    }
    this.apiKey = providerConfig.apiKey;

    if (!providerConfig.baseUrl) {
      throw new Error(`Missing Base URL for provider: ${this.provider}`);
    }
    this.baseUrl = providerConfig.baseUrl;

    if (!providerConfig.model) {
      throw new Error(`Missing Model for provider: ${this.provider}`);
    }
    this.model = providerConfig.model;

    this.openai = new OpenAI({
      baseURL: this.baseUrl,
      apiKey: this.apiKey,
      defaultHeaders: this.getDefaultHeaders(this.provider),
    });
  }

  onModuleInit(): void {
    setTimeout(() => {
      void this.printLocalOllamaModels();
    }, 1500);
  }

  async getProviders(): Promise<ServiceResultContainer<LlmProviderDto[]>> {
    const providerDtos = await Promise.all(
      LLM_PROVIDERS.map(async (provider) => {
        const config = this.getProviderConfig(provider);
        const configured = this.isProviderConfigured(config);
        const ollamaModels = provider === 'ollama' && configured ? await this.getSafeLocalOllamaModels() : [];

        return {
          id: provider,
          active: provider === this.provider,
          configured,
          available: provider === 'ollama' ? ollamaModels.length > 0 : configured,
          configuredModel: config.model || undefined,
          models: ollamaModels.length > 0 ? ollamaModels.map((model) => model.name) : undefined,
        };
      }),
    );

    return {
      success: true,
      message: 'LLM providers retrieved successfully.',
      result: providerDtos,
    };
  }

  async getModelOptions(): Promise<ServiceResultContainer<LlmModelGroupDto[]>> {
    const ollamaModels = await this.getSafeLocalOllamaModels();
    const modelGroups: LlmModelGroupDto[] = [
      ...LLM_STATIC_MODEL_GROUPS,
      {
        label: 'ollama',
        items: ollamaModels.map((model) => {
          return {
            value: model.name,
            label: model.name,
          };
        }),
      },
    ];

    return {
      success: true,
      message: 'LLM model options retrieved successfully.',
      result: modelGroups,
    };
  }

  async getStatus(): Promise<ServiceResultContainer<LlmStatusDto>> {
    const providersResult = await this.getProviders();

    return {
      success: true,
      message: 'LLM status retrieved successfully.',
      result: {
        activeProvider: this.provider,
        activeModel: this.model ?? '',
        providers: providersResult.result ?? [],
      },
    };
  }

  getRuntimeSelection(providerOverride?: LlmProvider, modelOverride?: string): LlmRuntimeSelection {
    return {
      provider: providerOverride ?? this.provider,
      model: modelOverride ?? this.model ?? '',
    };
  }

  async printLocalOllamaModels(): Promise<void> {
    if (this.provider !== 'ollama') {
      return;
    }

    try {
      const models = await this.getLocalOllamaModels();
      if (models.length === 0) {
        return;
      }

      this.logger.log('--- START OF LOCAL OLLAMA MODELS ---');

      const modelWidth = Math.max(...models.map((model) => model.name.length || 0));
      const sizeWidth = Math.max(...models.map((model) => (model.size ?? 0).toString().length || 0));

      models.forEach((model) => {
        const sizeInGb = ((model.size ?? 0) / (1024 * 1024 * 1024)).toFixed(2);
        this.logger.log(
          `Model: "${model.name.padEnd(modelWidth)}" | Size: ${sizeInGb.padEnd(sizeWidth)} GB | Family: ${model.details?.family || 'N/A'}`,
        );
      });

      this.logger.log('--- END OF LOCAL OLLAMA MODELS ---');
    } catch (error: unknown) {
      this.logger.warn(`Could not automatically query local Ollama models: ${this.getErrorMessage(error)}`);
    }
  }

  private getClient(providerOverride?: LlmProvider): OpenAI {
    if (!providerOverride) {
      return this.openai;
    }

    const providerConfig = this.getProviderConfig(providerOverride);

    return new OpenAI({
      baseURL: providerConfig.baseUrl,
      apiKey: providerConfig.apiKey,
      defaultHeaders: this.getDefaultHeaders(providerOverride),
    });
  }

  private getProviderConfig(provider: LlmProvider): LlmProviderConfig {
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

  private getDefaultHeaders(provider: LlmProvider): Record<string, string> {
    if (provider !== 'openrouter') {
      return {};
    }

    return { 'HTTP-Referer': 'http://localhost:3000', 'X-Title': 'NestJS AI Agent' };
  }

  private isProviderConfigured(config: LlmProviderConfig): boolean {
    return Boolean(config.apiKey && config.baseUrl && config.model);
  }

  private async getLocalOllamaModels(): Promise<OllamaModel[]> {
    const config = this.getProviderConfig('ollama');
    const rawBaseUrl = config.baseUrl.replace('/v1', '');
    const response = await fetch(`${rawBaseUrl}/api/tags`);

    if (!response.ok) {
      return [];
    }

    const data = await response.json() as OllamaTagsResponse;
    return data.models ?? [];
  }

  private async getSafeLocalOllamaModels(): Promise<OllamaModel[]> {
    try {
      return await this.getLocalOllamaModels();
    } catch (error: unknown) {
      this.logger.warn(`Could not query local Ollama models: ${this.getErrorMessage(error)}`);
      return [];
    }
  }

  private async withRetry<T>(fn: () => Promise<T>, label: string): Promise<T> {
    let lastError: unknown = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt = attempt + 1) {
      try {
        return await fn();
      } catch (error: unknown) {
        lastError = error;
        const errorLike = error as { status?: number; message?: string };
        const isRetryable =
          errorLike.status === 429 ||
          errorLike.status === 503 ||
          errorLike.status === 502 ||
          errorLike.message?.includes('no choices') ||
          errorLike.message?.includes('rate limit') ||
          errorLike.message?.includes('overloaded');

        if (!isRetryable || attempt === MAX_RETRIES) {
          break;
        }

        const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
        this.logger.warn(
          `[${label}] attempt ${attempt}/${MAX_RETRIES} failed - retrying in ${delay}ms. Error: ${this.getErrorMessage(error)}`,
        );
        await new Promise((resolve) => {
          setTimeout(resolve, delay);
        });
      }
    }

    throw lastError;
  }

  async generateResponse(llmRequest: LlmRequest): Promise<LlmResponse> {
    const { prompt, systemContext, messageHistory, providerOverride, modelOverride, tools } = llmRequest;
    const client = this.getClient(providerOverride);
    const activeModel = modelOverride || this.model;

    if (!activeModel) {
      throw new Error('Missing active model configuration');
    }

    this.logger.log(`Generating response via ${providerOverride || this.provider} (model: ${activeModel})`);

    const completion = await this.withRetry(async () => {
      const result = await client.chat.completions.create({
        model: activeModel,
        messages: [
          { role: 'system', content: systemContext || 'You are a helpful assistant.' },
          ...(messageHistory?.length ? messageHistory : []),
          { role: 'user', content: prompt },
        ],
        tools: tools && tools.length > 0 ? tools as OpenAI.Chat.Completions.ChatCompletionTool[] : undefined,
        temperature: 0.2,
      });

      const firstChoice = result?.choices?.[0];
      if (!firstChoice?.message) {
        throw new Error('Returned no choices from AI model');
      }

      return result;
    }, 'generateResponse');

    const message = completion.choices[0].message;
    const content = typeof message?.content === 'string' ? message.content : null;
    const toolCalls = (message.tool_calls || []) as LlmToolCall[];

    this.logger.log(`Response OK: content=${content?.length ?? 0} chars, toolCalls=${toolCalls.length}`);
    return { content, toolCalls };
  }

  async *generateStream(llmRequest: LlmRequest): AsyncIterable<string> {
    const { prompt, systemContext, messageHistory, providerOverride, modelOverride, tools } = llmRequest;
    const client = this.getClient(providerOverride);
    const activeModel = modelOverride || this.model;

    if (!activeModel) {
      throw new Error('Missing active model configuration');
    }

    this.logger.log(`Streaming response via ${providerOverride || this.provider} (model: ${activeModel})`);

    try {
      const stream = await this.withRetry(() => {
        return client.chat.completions.create({
          model: activeModel,
          stream: true,
          messages: [
            { role: 'system', content: systemContext || 'You are a helpful assistant.' },
            ...(messageHistory?.length ? messageHistory : []),
            { role: 'user', content: prompt },
          ],
          tools: tools && tools.length > 0 ? tools as OpenAI.Chat.Completions.ChatCompletionTool[] : undefined,
          temperature: 0.7,
        });
      }, 'generateStream');

      for await (const chunk of stream) {
        const token = chunk.choices[0]?.delta?.content;
        if (token) {
          yield token;
        }
      }
    } catch (error: unknown) {
      this.logger.error(`Stream Error (after retries): ${this.getErrorMessage(error)}`);
      yield `[AI connection error: ${this.getErrorMessage(error)}]`;
    }
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return 'Unknown error';
  }

  async checkLlm(
    provider: LlmProvider,
    model: string,
    prompt: string,
    systemContext: string,
  ): Promise<ServiceResultContainer<{ provider: LlmProvider; model: string; available: boolean }>> {
    const runtimeSelection = this.getRuntimeSelection(provider, model);
    const response = await this.generateResponse({
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
}
