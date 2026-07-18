import { Injectable, Logger, BadRequestException } from '@nestjs/common';
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
    const { prompt, systemContext, messageHistory, providerOverride, modelOverride, tools, image, maxTokens, userId } = llmRequest;

    // Resolve effective provider/model: explicit override → user default → legacy env
    const legacyProvider = this.providerConfig.getActiveProvider();
    const legacyModel = this.providerConfig.getActiveModel();
    const resolved = await this.dbProviderService.resolveEffectiveModel(
      providerOverride, modelOverride, userId, legacyProvider, legacyModel,
    );

    const { client, dbProvider } = await this.getClient(resolved.provider);
    const activeProvider = resolved.provider;
    const activeModel = resolved.model;

    if (!activeModel) {
      throw new Error('Missing active model configuration');
    }

    await this.assertCapability(activeProvider, activeModel, 'text');

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
    const { prompt, systemContext, messageHistory, providerOverride, modelOverride, tools, image, maxTokens, userId } = llmRequest;

    // Resolve effective provider/model: explicit override → user default → legacy env
    const legacyProvider = this.providerConfig.getActiveProvider();
    const legacyModel = this.providerConfig.getActiveModel();
    const resolved = await this.dbProviderService.resolveEffectiveModel(
      providerOverride, modelOverride, userId, legacyProvider, legacyModel,
    );

    const { client, dbProvider } = await this.getClient(resolved.provider);
    const activeProvider = resolved.provider;
    const activeModel = resolved.model;

    if (!activeModel) {
      throw new Error('Missing active model configuration');
    }

    await this.assertCapability(activeProvider, activeModel, 'text');

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

  private async assertCapability(provider: string, model: string, expected: 'text' | 'image' | 'video'): Promise<void> {
    const dbModel = await this.dbProviderService.findModelByKey(model);
    if (!dbModel) {
      return;
    }

    if (dbModel.capability !== expected) {
      const label = expected === 'text' ? 'text chat' : expected === 'image' ? 'image generation' : 'video generation';
      throw new BadRequestException(`Model ${model} (${dbModel.capability}) does not support ${label}`);
    }
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

  /**
   * Resolves the DB provider connection (base URL + API key) for a provider key.
   * Used by the image/video raw-fetch paths that the OpenAI SDK does not cover.
   */
  private async getProviderConnection(providerOverride?: string): Promise<{ baseUrl: string; apiKey: string; dbProvider: Awaited<ReturnType<typeof this.dbProviderService.findProviderByKey>> }> {
    const providerKey = providerOverride || this.providerConfig.getActiveProvider();
    const dbProvider = await this.dbProviderService.findProviderByKey(providerKey);

    if (!dbProvider) {
      throw new Error(`LLM Provider with key '${providerKey}' was not found in the database.`);
    }

    return {
      baseUrl: dbProvider.baseUrl.replace(/\/$/, ''),
      apiKey: dbProvider.apiKey ? dbProvider.apiKey.trim() : '',
      dbProvider,
    };
  }

  /**
   * Generates an image via the Agnes `/v1/images/generations` endpoint.
   *
   * The OpenAI SDK shape is compatible in theory, but Agnes requires
   * `response_format` and image-input (`extra_body.image`) to live inside
   * `extra_body` — a non-standard quirk that makes `client.images.generate`
   * unreliable. We use a raw fetch against the provider base URL instead.
   */
  async generateImage(request: {
    provider: string;
    model: string;
    prompt: string;
    size?: string;
    ratio?: string;
    image?: string | string[];
    returnBase64?: boolean;
  }): Promise<{ url?: string; b64Json?: string; mimeType?: string; size?: string }> {
    const { provider, model, prompt, size, ratio, image, returnBase64 } = request;

    await this.assertCapability(provider, model, 'image');

    const { baseUrl, apiKey } = await this.getProviderConnection(provider);

    const images = Array.isArray(image) ? image : image ? [image] : [];

    // `size` is required by the Agnes image API. Default to a safe 1:1 size.
    const resolvedSize = size || '1024x1024';

    const extraBody: Record<string, unknown> = {};
    // Response format (url | b64_json) lives inside extra_body per Agnes docs.
    extraBody.response_format = returnBase64 ? 'b64_json' : 'url';
    if (images.length > 0) {
      extraBody.image = images;
    }
    if (ratio) {
      extraBody.ratio = ratio;
    }

    // `return_base64` is a top-level flag for text-to-image per the 2.1 docs.
    const body: Record<string, unknown> = {
      model,
      prompt,
      size: resolvedSize,
      n: 1,
      ...(returnBase64 ? { return_base64: true } : {}),
      extra_body: extraBody,
    };

    const result = await this.withRetry(async () => {
      const res = await fetch(`${baseUrl}/images/generations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(360_000),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Agnes image generation failed (${res.status}): ${text.slice(0, 500)}`);
      }

      return (await res.json()) as {
        data?: Array<{ url?: string; b64_json?: string }>;
        mime_type?: string;
        size?: string;
      };
    }, 'generateImage');

    const first = result.data?.[0];
    if (!first) {
      throw new Error('Agnes image generation returned no data');
    }

    return {
      url: first.url ?? undefined,
      b64Json: first.b64_json ?? undefined,
      mimeType: result.mime_type,
      size: result.size,
    };
  }

  /**
   * Creates an asynchronous video generation task via `POST /v1/videos`.
   * Returns the video id immediately; the caller polls `getVideoResult`.
   */
  async createVideoTask(request: {
    provider: string;
    model: string;
    prompt: string;
    image?: string;
    mode?: 'ti2vid' | 'keyframes';
    height?: number;
    width?: number;
    numFrames?: number;
    frameRate?: number;
    numInferenceSteps?: number;
    seed?: number;
    negativePrompt?: string;
  }): Promise<{ taskId?: string; videoId: string; status: 'queued' | 'in_progress' | 'completed' | 'failed'; seconds?: number | string; size?: string }> {
    const { provider, model, prompt, image, mode, height, width, numFrames, frameRate, numInferenceSteps, seed, negativePrompt } = request;

    await this.assertCapability(provider, model, 'video');

    const { baseUrl, apiKey } = await this.getProviderConnection(provider);

    const extraBody: Record<string, unknown> = {};
    if (mode) {
      extraBody.mode = mode;
    }

    const body: Record<string, unknown> = {
      model,
      prompt,
      ...(image ? { image } : {}),
      ...(height ? { height } : {}),
      ...(width ? { width } : {}),
      ...(numFrames ? { num_frames: numFrames } : {}),
      ...(frameRate ? { frame_rate: frameRate } : {}),
      ...(typeof numInferenceSteps === 'number' ? { num_inference_steps: numInferenceSteps } : {}),
      ...(typeof seed === 'number' ? { seed } : {}),
      ...(negativePrompt ? { negative_prompt: negativePrompt } : {}),
      ...(Object.keys(extraBody).length > 0 ? { extra_body: extraBody } : {}),
    };

    const res = await fetch(`${baseUrl}/videos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120_000),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Agnes video creation failed (${res.status}): ${text.slice(0, 500)}`);
    }

    const json = (await res.json()) as {
      task_id?: string;
      video_id?: string;
      id?: string;
      status?: string;
      seconds?: number;
      size?: string;
    };

    const videoId = json.video_id ?? json.id ?? json.task_id ?? '';
    if (!videoId) {
      throw new Error('Agnes video creation returned no video id');
    }

    return {
      taskId: json.task_id,
      videoId,
      status: (json.status as any) ?? 'queued',
      seconds: json.seconds,
      size: json.size,
    };
  }

  /**
   * Polls the video generation status via `GET /agnesapi?video_id=<id>`.
   */
  async getVideoResult(
    videoId: string,
    provider: string,
  ): Promise<{ status: 'queued' | 'in_progress' | 'completed' | 'failed'; url?: string; error?: string | Record<string, unknown> | null; seconds?: number | string }> {
    const { baseUrl, apiKey } = await this.getProviderConnection(provider);

    const res = await fetch(`${baseUrl}/agnesapi?video_id=${encodeURIComponent(videoId)}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      signal: AbortSignal.timeout(60_000),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Agnes video poll failed (${res.status}): ${text.slice(0, 500)}`);
    }

    const json = (await res.json()) as {
      status?: string;
      video_url?: string;
      url?: string;
      error?: string;
      seconds?: number;
    };

    const status = (json.status ?? 'in_progress') as 'queued' | 'in_progress' | 'completed' | 'failed';

    if (status === 'failed') {
      throw new Error(json.error ?? 'Agnes video generation failed');
    }

    return {
      status,
      url: json.video_url ?? json.url,
      seconds: json.seconds,
    };
  }
}