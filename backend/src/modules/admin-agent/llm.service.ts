import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

export type LlmToolSchema = {
  type: 'function';
  function: {
    name: string;
    description?: string;
    parameters: Record<string, unknown>;
  };
};

export type LlmToolCall = {
  id?: string;
  type: 'function';
  function: {
    name: string;
    arguments?: string;
  };
};

export type LlmResponse = {
  content: string | null;
  toolCalls: LlmToolCall[];
};

export interface LlmRequest {
  prompt: string;
  systemContext?: string;
  tools?: LlmToolSchema[];
  messageHistory?: (
    | { role: 'user' | 'assistant'; content: string }
    | { role: 'tool'; content: string; tool_call_id: string }
  )[];
  providerOverride?: 'openrouter' | 'nvidia';
  modelOverride?: string;
}

const MAX_RETRIES = 4;
const BASE_DELAY_MS = 1500;

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private openai: OpenAI;
  private provider: 'openrouter' | 'nvidia' = 'nvidia';
  private model?: string;
  private baseUrl?: string;
  private apiKey?: string;

  constructor(private readonly configService: ConfigService) {
    const provider = this.configService.get('AI_PROVIDER');
    if (!provider) {
      throw new Error('Missing AI_PROVIDER environment variable');
    }
    this.provider = provider;

    const apiKey =
      this.provider === 'openrouter'
        ? this.configService.get<string>('OPENROUTER_API_KEY')
        : this.configService.get<string>('NVIDIA_API_KEY');
    if (!apiKey) {
      throw new Error(`Missing API key for provider: ${this.provider}`);
    }
    this.apiKey = apiKey;

    const baseUrl =
      this.provider === 'openrouter'
        ? this.configService.get<string>('OPENROUTER_BASE_URL')
        : this.configService.get<string>('NVIDIA_BASE_URL');
    if (!baseUrl) {
      throw new Error(`Missing Base URL for provider: ${this.provider}`);
    }
    this.baseUrl = baseUrl;

    const model =
      this.provider === 'openrouter'
        ? this.configService.get<string>('OPENROUTER_MODEL')
        : this.configService.get<string>('NVIDIA_MODEL');
    if (!model) {
      throw new Error(`Missing Model for provider: ${this.provider}`);
    }
    this.model = model;

    this.openai = new OpenAI({
      baseURL: this.baseUrl,
      apiKey: this.apiKey,
      defaultHeaders:
        this.provider === 'openrouter'
          ? { 'HTTP-Referer': 'http://localhost:3000', 'X-Title': 'NestJS AI Agent' }
          : {},
    });
  }

  private getClient(providerOverride?: 'openrouter' | 'nvidia'): OpenAI {
    if (!providerOverride) {
      return this.openai;
    }

    const isOpenRouter = providerOverride === 'openrouter';
    const baseUrl = isOpenRouter
      ? this.configService.get<string>('OPENROUTER_BASE_URL')
      : this.configService.get<string>('NVIDIA_BASE_URL');
    const apiKey = isOpenRouter
      ? this.configService.get<string>('OPENROUTER_API_KEY')
      : this.configService.get<string>('NVIDIA_API_KEY');

    return new OpenAI({
      baseURL: baseUrl,
      apiKey: apiKey,
      defaultHeaders: isOpenRouter
        ? { 'HTTP-Referer': 'http://localhost:3000', 'X-Title': 'NestJS AI Dynamic Router' }
        : {},
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
        this.logger.warn(`[${label}] attempt ${attempt}/${MAX_RETRIES} failed — retrying in ${delay}ms. Error: ${error.message}`);
        await new Promise((r) => {
          setTimeout(r, delay);
        });
      }
    }

    throw lastError;
  }

  async generateResponse(llmRequest: LlmRequest): Promise<LlmResponse> {
    const { prompt, systemContext, tools, messageHistory, providerOverride, modelOverride } = llmRequest;
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
        tools,
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
    const toolCalls = ((message as any)?.tool_calls ?? []) as LlmToolCall[];

    this.logger.log(`Response OK: content=${content?.length ?? 0} chars, toolCalls=${toolCalls.length}`);
    return { content, toolCalls };
  }

  async *generateStream(llmRequest: LlmRequest): AsyncIterable<string> {
    const { prompt, systemContext, tools, messageHistory, providerOverride, modelOverride } = llmRequest;
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
            tools: tools as any,
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