import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { LlmRequest, LlmResponse, LlmToolCall, LlmProvider } from '../types/llm.types';
import { LlmProviderConfigService } from './llm-provider-config.service';

const MAX_RETRIES = 4;
const BASE_DELAY_MS = 1500;

@Injectable()
export class LlmClientService {
  private readonly logger = new Logger(LlmClientService.name);
  private readonly openai: OpenAI;

  constructor(private readonly providerConfig: LlmProviderConfigService) {
    const activeProvider = this.providerConfig.getActiveProvider();
    const config = this.providerConfig.getProviderConfig(activeProvider);

    this.openai = new OpenAI({
      baseURL: config.baseUrl,
      apiKey: config.apiKey,
      defaultHeaders: this.providerConfig.getDefaultHeaders(activeProvider),
    });
  }

  async generateResponse(llmRequest: LlmRequest): Promise<LlmResponse> {
    const { prompt, systemContext, messageHistory, providerOverride, modelOverride, tools } = llmRequest;
    const client = this.getClient(providerOverride);
    const activeProvider = this.providerConfig.getActiveProvider();
    const activeModel = modelOverride || this.providerConfig.getActiveModel();

    if (!activeModel) {
      throw new Error('Missing active model configuration');
    }

    this.logger.log(`Generating response via ${providerOverride || activeProvider} (model: ${activeModel})`);

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
    const client = this.getClient(providerOverride);
    const activeProvider = this.providerConfig.getActiveProvider();
    const activeModel = modelOverride || this.providerConfig.getActiveModel();

    if (!activeModel) {
      throw new Error('Missing active model configuration');
    }

    this.logger.log(`Streaming response via ${providerOverride || activeProvider} (model: ${activeModel})`);

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

  private getClient(providerOverride?: LlmProvider): OpenAI {
    if (!providerOverride) {
      return this.openai;
    }

    const config = this.providerConfig.getProviderConfig(providerOverride);

    return new OpenAI({
      baseURL: config.baseUrl,
      apiKey: config.apiKey,
      defaultHeaders: this.providerConfig.getDefaultHeaders(providerOverride),
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
