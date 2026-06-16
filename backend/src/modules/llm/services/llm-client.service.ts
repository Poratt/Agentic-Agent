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
    const { prompt, systemContext, messageHistory, providerOverride, modelOverride, tools } = llmRequest;

    // 🚀 הבאת הקליינט בצורה אסינכרונית מה-DB 🚀
    const client = await this.getClient(providerOverride);
    const activeProvider = providerOverride || this.providerConfig.getActiveProvider();
    const activeModel = modelOverride || this.providerConfig.getActiveModel();

    if (!activeModel) {
      throw new Error('Missing active model configuration');
    }

    this.logger.log(`Generating response via ${activeProvider} (model: ${activeModel})`);

    const completion = await this.withRetry(async () => {
      const result = await client.chat.completions.create({
        model: activeModel,
        messages: [
          { role: 'system', content: systemContext || 'You are a helpful assistant.' },
          ...(messageHistory?.length ? messageHistory : []),
          { role: 'user', content: prompt },
        ],
        tools: tools && tools.length > 0 ? (tools as OpenAI.Chat.Completions.ChatCompletionTool[]) : undefined,
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

    // 🚀 הבאת הקליינט בצורה אסינכרונית מה-DB 🚀
    const client = await this.getClient(providerOverride);
    const activeProvider = providerOverride || this.providerConfig.getActiveProvider();
    const activeModel = modelOverride || this.providerConfig.getActiveModel();

    if (!activeModel) {
      throw new Error('Missing active model configuration');
    }

    this.logger.log(`Streaming response via ${activeProvider} (model: ${activeModel})`);

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
          tools: tools && tools.length > 0 ? (tools as OpenAI.Chat.Completions.ChatCompletionTool[]) : undefined,
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

  private async getClient(providerOverride?: string): Promise<OpenAI> {
    const providerKey = providerOverride || this.providerConfig.getActiveProvider();

    const dbProvider = await this.dbProviderService.findProviderByKey(providerKey);

    if (!dbProvider) {
      throw new Error(`LLM Provider with key '${providerKey}' was not found in the database.`);
    }

    this.logger.log(`Initializing OpenAI client for ${dbProvider.label} using DB credentials.`);

    console.log(dbProvider);


    return new OpenAI({
      baseURL: dbProvider.baseUrl,
      apiKey: dbProvider.apiKey ? dbProvider.apiKey.trim() : undefined,
      defaultHeaders: this.providerConfig.getDefaultHeaders(dbProvider.key as any),
    });
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

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return 'Unknown error';
  }
}