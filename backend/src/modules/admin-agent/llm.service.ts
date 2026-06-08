// FILE: src/modules/admin-agent/llm.service.ts

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

export type LlmToolSchema = {
  type: 'function';
  function?: {
    name: string;
    description?: string;
    parameters?: any;
  };
};

export type LlmToolCall = {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
};

export type LlmResponse = {
  content: string | null;
  toolCalls?: LlmToolCall[];
};

export type LlmMessage =
  | { role: 'user'; content: string }
  | { role: 'assistant'; content: string | null; tool_calls?: LlmToolCall[] }
  | { role: 'tool'; tool_call_id: string; content: string };

export interface LlmRequest {
  prompt: string;
  systemContext?: string;
  tools?: LlmToolSchema[];
  messageHistory?: LlmMessage[];
  providerOverride?: 'openrouter' | 'nvidia' | 'ollama';
  modelOverride?: string;
}

const MAX_RETRIES = 4;
const BASE_DELAY_MS = 1500;

@Injectable()
export class LlmService implements OnModuleInit {
  private readonly logger = new Logger(LlmService.name);
  private openai: OpenAI;
  private provider: 'openrouter' | 'nvidia' | 'ollama' = 'nvidia';
  private model?: string;
  private baseUrl?: string;
  private apiKey?: string;

  constructor(private readonly configService: ConfigService) {
    const provider = this.configService.get<'openrouter' | 'nvidia' | 'ollama'>('AI_PROVIDER');
    if (!provider) {
      throw new Error('Missing AI_PROVIDER environment variable');
    }
    this.provider = provider;

    let apiKey = '';
    let baseUrl = '';
    let model = '';

    if (this.provider === 'openrouter') {
      apiKey = this.configService.get<string>('OPENROUTER_API_KEY') ?? '';
      baseUrl = this.configService.get<string>('OPENROUTER_BASE_URL') ?? '';
      model = this.configService.get<string>('OPENROUTER_MODEL') ?? '';
    } else if (this.provider === 'nvidia') {
      apiKey = this.configService.get<string>('NVIDIA_API_KEY') ?? '';
      baseUrl = this.configService.get<string>('NVIDIA_BASE_URL') ?? '';
      model = this.configService.get<string>('NVIDIA_MODEL') ?? '';
    } else if (this.provider === 'ollama') {
      apiKey = this.configService.get<string>('OLLAMA_API_KEY') ?? 'ollama';
      baseUrl = this.configService.get<string>('OLLAMA_BASE_URL') ?? 'http://localhost:11434/v1';
      model = this.configService.get<string>('OLLAMA_MODEL') ?? 'llama3';
    }

    if (!apiKey) {
      throw new Error(`Missing API key for provider: ${this.provider}`);
    }
    this.apiKey = apiKey;

    if (!baseUrl) {
      throw new Error(`Missing Base URL for provider: ${this.provider}`);
    }
    this.baseUrl = baseUrl;

    if (!model) {
      throw new Error(`Missing Model for provider: ${this.provider}`);
    }
    this.model = model;

    const defaultHeaders = this.provider === 'openrouter'
      ? { 'HTTP-Referer': 'http://localhost:3000', 'X-Title': 'NestJS AI Agent' }
      : {};

    this.openai = new OpenAI({
      baseURL: this.baseUrl,
      apiKey: this.apiKey,
      defaultHeaders,
    });
  }

  onModuleInit(): void {
    setTimeout(() => {
      void this.printLocalOllamaModels();
    }, 1500);
  }

  async printLocalOllamaModels(): Promise<void> {
    if (this.provider !== 'ollama') {
      return;
    }

    try {
      // אולמה חושף את ה-endpoint תחת הפורט הראשי שלו
      const rawBaseUrl = this.baseUrl?.replace('/v1', '') ?? 'http://localhost:11434';
      const response = await fetch(`${rawBaseUrl}/api/tags`);

      if (response.ok) {
        const data = await response.json();
        const models = data.models || [];

        this.logger.log('--- START OF LOCAL OLLAMA MODELS ---');

        const modelWidth = Math.max(...models.map((model: any) => model.name.length || 0))
        const sizeWidth = Math.max(...models.map((model: any) => model.size.toString().length || 0))

        models.forEach((m: any) => {
          const sizeInGb = (m.size / (1024 * 1024 * 1024)).toFixed(2);
          this.logger.log(`Model: "${m.name.padEnd(modelWidth)}" | Size: ${sizeInGb.padEnd(sizeWidth)} GB | Family: ${m.details?.family || 'N/A'}`);
        });

        this.logger.log('--- END OF LOCAL OLLAMA MODELS ---');
      }
    } catch (error: any) {
      this.logger.warn(`Could not automatically query local Ollama models: ${error.message}`);
    }
  }

  private getClient(providerOverride?: 'openrouter' | 'nvidia' | 'ollama'): OpenAI {
    if (!providerOverride) {
      return this.openai;
    }

    let baseUrl = '';
    let apiKey = '';

    if (providerOverride === 'openrouter') {
      baseUrl = this.configService.get<string>('OPENROUTER_BASE_URL') ?? '';
      apiKey = this.configService.get<string>('OPENROUTER_API_KEY') ?? '';
    } else if (providerOverride === 'nvidia') {
      baseUrl = this.configService.get<string>('NVIDIA_BASE_URL') ?? '';
      apiKey = this.configService.get<string>('NVIDIA_API_KEY') ?? '';
    } else if (providerOverride === 'ollama') {
      baseUrl = this.configService.get<string>('OLLAMA_BASE_URL') ?? 'http://localhost:11434/v1';
      apiKey = this.configService.get<string>('OLLAMA_API_KEY') ?? 'ollama';
    }

    const defaultHeaders = providerOverride === 'openrouter'
      ? { 'HTTP-Referer': 'http://localhost:3000', 'X-Title': 'NestJS AI Dynamic Router' }
      : {};

    return new OpenAI({
      baseURL: baseUrl,
      apiKey: apiKey,
      defaultHeaders,
    });
  }

  private async withRetry<T>(fn: () => Promise<T>, label: string): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt = attempt + 1) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;
        const isRetryable =
          error?.status === 429 ||
          error?.status === 503 ||
          error?.status === 502 ||
          error?.message?.includes('no choices') ||
          error?.message?.includes('rate limit') ||
          error?.message?.includes('overloaded');

        if (!isRetryable || attempt === MAX_RETRIES) {
          break;
        }

        const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
        this.logger.warn(
          `[${label}] attempt ${attempt}/${MAX_RETRIES} failed - retrying in ${delay}ms. Error: ${error.message}`
        );
        await new Promise((r) => {
          setTimeout(r, delay);
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
        tools: tools && tools.length > 0 ? (tools as any) : undefined,
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
      const stream = await this.withRetry(
        () => {
          return client.chat.completions.create({
            model: activeModel,
            stream: true,
            messages: [
              { role: 'system', content: systemContext || 'You are a helpful assistant.' },
              ...(messageHistory?.length ? messageHistory : []),
              { role: 'user', content: prompt },
            ],
            tools: tools && tools.length > 0 ? (tools as any) : undefined,
            temperature: 0.7,
          });
        },
        'generateStream',
      ) as any;

      for await (const chunk of stream) {
        const token = chunk.choices[0]?.delta?.content;
        if (token) {
          yield token;
        }
      }
    } catch (error: any) {
      this.logger.error(`Stream Error (after retries): ${error.message}`, error.stack);
      yield `[שגיאה בחיבור ל-AI: ${error.message}]`;
    }
  }
}