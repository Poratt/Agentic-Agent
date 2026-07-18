import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { LlmRequest, LlmResponse, LlmToolCall } from '../types/llm.types';
import { LlmProviderConfigService } from './llm-provider-config.service';
import { LlmProviderService } from '../../llm-provider/llm-provider.service';

const MAX_RETRIES = 4;
const BASE_DELAY_MS = 1500;

@Injectable()
export class LlmClientService {
  private readonly logger = new Logger(LlmClientService.name);

  constructor(
    private readonly providerConfig: LlmProviderConfigService,
    private readonly dbProviderService: LlmProviderService,
  ) { }

  async generateResponse(llmRequest: LlmRequest): Promise<LlmResponse> {
    const { prompt, systemContext, messageHistory, providerOverride, modelOverride, tools, image, maxTokens } = llmRequest;

    // 🚀 הבאת הקליינט בצורה אסינכרונית מה-DB 🚀
    const { client, dbProvider } = await this.getClient(providerOverride);
    const activeProvider = providerOverride || this.providerConfig.getActiveProvider();
    const activeModel = modelOverride || this.providerConfig.getActiveModel();

    if (!activeModel) {
      throw new Error('Missing active model configuration');
    }

    this.logger.log(`Generating response via ${activeProvider} (model: ${activeModel})`);

    const start = Date.now();
    const completion = await this.withRetry(async () => {
      const result = await client.chat.completions.create({
        model: activeModel,
        messages: [
          { role: 'system', content: systemContext || 'You are a helpful assistant.' },
          ...(messageHistory?.length ? messageHistory : []),
          ...(prompt ? [{ role: 'user' as const, content: this.buildUserMessage(prompt, image) }] : []),
        ],
        tools: tools && tools.length > 0 ? (tools as OpenAI.Chat.Completions.ChatCompletionTool[]) : undefined,
        temperature: 0.2,
        max_tokens: maxTokens ?? 1024,
        ...(activeProvider === 'openrouter' && { reasoning: { enabled: false } }),
      } as any, {});

      const firstChoice = result?.choices?.[0];
      if (!firstChoice?.message) {
        throw new Error('Returned no choices from AI model');
      }

      return result;
    }, 'generateResponse');
    this.logger.log(`LLM response took ${((Date.now() - start) / 1000).toFixed(1)}s`);

    const message = completion.choices[0].message;
    const content = typeof message?.content === 'string' ? message.content : null;
    const toolCalls = (message.tool_calls || []) as LlmToolCall[];

    this.logger.log(`Response OK: content=${content?.length ?? 0} chars: ${content?.slice(0, 200)}... toolCalls=${toolCalls.length}`);
    this.logger.log(`[RESPONSE] provider=${dbProvider.key} (${dbProvider.label}) model=${activeModel} tokens=${content?.length ?? 0}`);
    return { content, toolCalls };
  }

  async *generateStream(llmRequest: LlmRequest): AsyncIterable<string> {
    const { prompt, systemContext, messageHistory, providerOverride, modelOverride, tools, image, maxTokens } = llmRequest;

    // 🚀 הבאת הקליינט בצורה אסינכרונית מה-DB 🚀
    const { client, dbProvider } = await this.getClient(providerOverride);
    const activeProvider = providerOverride || this.providerConfig.getActiveProvider();
    const activeModel = modelOverride || this.providerConfig.getActiveModel();

    if (!activeModel) {
      throw new Error('Missing active model configuration');
    }

    this.logger.log(`Streaming response via ${activeProvider} (model: ${activeModel})`);

    const start = Date.now();
    try {
      const stream = await this.withRetry(() => {
        return client.chat.completions.create({
          model: activeModel,
          stream: true,
          messages: [
            { role: 'system', content: systemContext || 'You are a helpful assistant.' },
            ...(messageHistory?.length ? messageHistory : []),
            { role: 'user', content: this.buildUserMessage(prompt, image) },
          ],
          tools: tools && tools.length > 0 ? (tools as OpenAI.Chat.Completions.ChatCompletionTool[]) : undefined,
          temperature: 0.7,
          max_tokens: maxTokens ?? 1024,
          ...(activeProvider === 'openrouter' && { reasoning: { enabled: false } }),
        } as OpenAI.Chat.Completions.ChatCompletionCreateParamsStreaming);
      }, 'generateStream');

      for await (const chunk of stream) {
        const token = chunk.choices[0]?.delta?.content;
        if (token) {
          yield token;
        }
      }
      this.logger.log(`LLM stream completed in ${((Date.now() - start) / 1000).toFixed(1)}s`);
    } catch (error: unknown) {
      this.logger.error(`Stream Error (after retries): ${this.getErrorMessage(error)}`);
      throw error;
    }

    this.logger.log(`[STREAM RESPONSE] provider=${dbProvider.key} (${dbProvider.label}) model=${activeModel}`);
  }

  private buildUserMessage(
    prompt: string,
    image?: string,
  ): OpenAI.Chat.Completions.ChatCompletionContentPart[] | string {
    if (!image) {
      return prompt;
    }

    return [
      { type: 'text', text: prompt || '' },
      {
        type: 'image_url',
        image_url: {
          url: image,
        },
      },
    ];
  }

  private async getClient(providerOverride?: string): Promise<{ client: OpenAI; dbProvider: Awaited<ReturnType<typeof this.dbProviderService.findProviderByKey>> }> {
    const providerKey = providerOverride || this.providerConfig.getActiveProvider();

    const dbProvider = await this.dbProviderService.findProviderByKey(providerKey);

    if (!dbProvider) {
      throw new Error(`LLM Provider with key '${providerKey}' was not found in the database.`);
    }

    this.logger.log(`Initializing OpenAI client for ${dbProvider.label} (${dbProvider.key}) using DB credentials.`);

    return {
      client: new OpenAI({
        baseURL: dbProvider.baseUrl,
        apiKey: dbProvider.apiKey ? dbProvider.apiKey.trim() : undefined,
        defaultHeaders: this.providerConfig.getDefaultHeaders(dbProvider.key as any),
      }),
      dbProvider,
    };
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
          errorLike.status === 503 ||
          errorLike.status === 502 ||
          errorLike.message?.includes('no choices') ||
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

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return 'Unknown error';
  }
}