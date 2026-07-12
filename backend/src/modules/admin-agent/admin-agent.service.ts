import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { LlmService } from '../llm/llm.service';
import { AgentSessionService } from './services/agent-session.service';
import { AgentToolExecutorService } from './services/agent-tool-executor.service';
import { ChatSession } from './entities/chat-session.entity';
import { ChatMessage } from './entities/chat-message.entity';
import { SYSTEM_CONTEXT, buildSystemContext, VISUAL_TRIGGER_KEYWORDS } from './constants/system-context.constant';
import { SwaggerToolsParser } from './services/swagger-tools.parser';
import type { LlmProvider, LlmToolCall } from '../llm/types/llm.types';

const MAX_ITERATIONS = 10;
const MAX_DUPLICATE_TOOL_CALLS = 2;
const PARALLEL_UNSAFE_TOOL_NAMES = new Set([
  'LlmController_testLlm',
  'LlmController_testAll',
]);
const STEP_ICONS = {
  tool: 'ph-gear',
  error: 'ph-warning-circle',
  success: 'ph-check-circle',
} as const;

type ToolCallResult = {
  call: LlmToolCall;
  resultData: string;
};

@Injectable()
export class AdminAgentService implements OnModuleInit {
  private readonly logger = new Logger(AdminAgentService.name);
  private readonly toolCallCounter: Map<string, number> = new Map<string, number>();

  constructor(
    private readonly llmService: LlmService,
    private readonly swaggerToolsParser: SwaggerToolsParser,
    private readonly agentSessionService: AgentSessionService,
    private readonly agentToolExecutorService: AgentToolExecutorService,
  ) { }

  onModuleInit(): void {
    this.logger.log('AdminAgentService initialized. Orchestrator ready.');
    setTimeout(() => {
      this.printParsedSwaggerTools();
    }, 1000);
  }

  private printParsedSwaggerTools(): void {
    try {
      const tools = this.swaggerToolsParser.getTools();
      this.logger.log(`--- START SWAGGER-TOOLS-PARSER OUTPUT: LOADED ${tools.length} TOOLS ---`);

      const fnWidth = Math.max(...tools.map((fn) => {
        return fn.function?.name.length || 0;
      }));

      tools.forEach((tool) => {
        const functionName = tool.function?.name;
        if (functionName) {
          const endpoint = this.swaggerToolsParser.getEndpoint(functionName);
          const uiSpecTag = endpoint?.genUiSpec ? 'HTML|' : '|'.padStart(5);
          const methodStr = endpoint?.method.toUpperCase();
          this.logger.log(
            `Tool Name: "${functionName.padEnd(fnWidth)}" |${uiSpecTag} ${endpoint?.path}, ${methodStr}`,
          );
        }
      });

      this.logger.log('--- END OF PARSED SWAGGER TOOLS OUTPUT ---');
    } catch (error: any) {
      this.logger.error(`Failed to execute swagger tools parser logging: ${error.message}`);
    }
  }

  async getSessions(userId: number, limit?: number): Promise<ChatSession[]> {
    return this.agentSessionService.getSessions(userId, limit);
  }

  async getSessionMessages(sessionId: number, userId: number) {
    return this.agentSessionService.getSessionMessages(sessionId, userId);
  }

  async getMessageImages(messageIds: number[], userId: number) {
    return this.agentSessionService.getMessageImages(messageIds, userId);
  }

  async createSession(userId: number): Promise<ChatSession> {
    return this.agentSessionService.createSession(userId);
  }

  async deleteSession(sessionId: number, userId: number): Promise<void> {
    return this.agentSessionService.deleteSession(sessionId, userId);
  }

  async deleteSessionMessage(sessionId: number, messageId: number, userId: number): Promise<void> {
    return this.agentSessionService.deleteSessionMessage(sessionId, messageId, userId);
  }

  async queryDatabase(
    prompt: string,
    userId: number,
    requestedSessionId?: number,
    provider?: LlmProvider,
    model?: string,
    image?: string,
  ): Promise<string> {
    this.resetToolCallCounter();
    const session = await this.agentSessionService.getOrCreateSession(userId, requestedSessionId);

    if (prompt && prompt.trim().length > 0) {
      await this.agentSessionService.updateSessionTitleIfDefault(session, prompt);
    }
    await this.agentSessionService.saveMessage(userId, session.id, 'user', prompt, { imageUrl: image });

    const tools = this.swaggerToolsParser.getTools();
    const dynamicSystemContext = this.getDynamicSystemContext(userId, provider, model, prompt);

    for (let iteration = 0; iteration < MAX_ITERATIONS; iteration = iteration + 1) {
      const history = await this.agentSessionService.loadHistory(session.id, userId);

      const llmResponse = await this.llmService.generateResponse({
        prompt,
        systemContext: dynamicSystemContext,
        messageHistory: history,
        tools,
        providerOverride: provider,
        modelOverride: model,
        image,
      });

      if (llmResponse.toolCalls && llmResponse.toolCalls.length > 0) {
        const duplicateCall = this.findDuplicateToolCall(llmResponse.toolCalls);

        if (duplicateCall) {
          const args = this.parseToolArguments(duplicateCall);
          this.logger.warn(
            `[AgentLoopBreaker] userId=${userId} sessionId=${session.id} toolName=${duplicateCall.function.name} args=${JSON.stringify(args)} — model called the same tool+args ${MAX_DUPLICATE_TOOL_CALLS + 1}+ times in one turn, breaking the loop.`,
          );
          const breakerMessage = this.breakerErrorMessage(duplicateCall.function.name, args);
          await this.agentSessionService.saveMessage(userId, session.id, 'assistant', breakerMessage);
          return breakerMessage;
        }

        await this.agentSessionService.saveMessage(
          userId,
          session.id,
          'assistant',
          this.truncateForStorage(JSON.stringify(llmResponse.toolCalls)),
          { toolCallId: 'YES_TOOL_CALLS' },
        );

        const groups = this.groupToolCallsForExecution(llmResponse.toolCalls);

        for (const group of groups) {
          for (const call of group) {
            this.recordToolCall(call);
          }

          const results = await this.executeToolCallGroup(group, userId);

          for (const { call, resultData } of results) {
            await this.agentSessionService.saveMessage(userId, session.id, 'tool', this.truncateForStorage(resultData), { toolCallId: call.id });
          }
        }
      } else {
        const assistantContent = llmResponse.content || '';
        await this.agentSessionService.saveMessage(userId, session.id, 'assistant', assistantContent);
        return assistantContent;
      }
    }

    return 'תקשורת הסוכן הופסקה עקב הגעה למספר האיטרציות המרבי.';
  }

  async *queryDatabaseStream(
    prompt: string,
    userId: number,
    requestedSessionId?: number,
    provider?: LlmProvider,
    model?: string,
    image?: string,
  ): AsyncIterable<string> {
    if (image && image.length > 15 * 1024 * 1024) {
      yield JSON.stringify({ type: 'token', content: 'התמונה גדולה מדי. מקסימום 10MB.' }) + '\n';
      return;
    }

    this.resetToolCallCounter();
    const session = await this.agentSessionService.getOrCreateSession(userId, requestedSessionId);

    if (prompt && prompt.trim().length > 0) {
      await this.agentSessionService.updateSessionTitleIfDefault(session, prompt);
    }
    await this.agentSessionService.saveMessage(userId, session.id, 'user', prompt, { imageUrl: image });

    const tools = this.swaggerToolsParser.getTools();
    const dynamicSystemContext = this.getDynamicSystemContext(userId, provider, model, prompt);

    for (let iteration = 0; iteration < MAX_ITERATIONS; iteration = iteration + 1) {
      const history = await this.agentSessionService.loadHistory(session.id, userId);

      const llmResponse = await this.llmService.generateResponse({
        prompt,
        systemContext: dynamicSystemContext,
        messageHistory: history,
        tools,
        providerOverride: provider,
        modelOverride: model,
        image,
      });

      if (llmResponse.toolCalls && llmResponse.toolCalls.length > 0) {
        const duplicateCall = this.findDuplicateToolCall(llmResponse.toolCalls);

        if (duplicateCall) {
          const args = this.parseToolArguments(duplicateCall);
          this.logger.warn(
            `[AgentLoopBreaker] userId=${userId} sessionId=${session.id} toolName=${duplicateCall.function.name} args=${JSON.stringify(args)} — model called the same tool+args ${MAX_DUPLICATE_TOOL_CALLS + 1}+ times in one turn, breaking the loop.`,
          );
          const breakerMessage = this.breakerErrorMessage(duplicateCall.function.name, args);
          yield JSON.stringify({ type: 'step', icon: STEP_ICONS.error, message: breakerMessage }) + '\n';
          yield JSON.stringify({ type: 'token', content: breakerMessage }) + '\n';
          await this.agentSessionService.saveMessage(userId, session.id, 'assistant', breakerMessage);
          return;
        }

        await this.agentSessionService.saveMessage(
          userId,
          session.id,
          'assistant',
          this.truncateForStorage(JSON.stringify(llmResponse.toolCalls)),
          { toolCallId: 'YES_TOOL_CALLS' },
        );

        const groups = this.groupToolCallsForExecution(llmResponse.toolCalls);

        for (const group of groups) {
          for (const call of group) {
          const args = this.parseToolArguments(call);
          const description = this.agentToolExecutorService.getSemanticActionDescription(call.function.name, args);
          const endpoint = this.swaggerToolsParser.getEndpoint(call.function.name);
          const toolIcon = endpoint?.toolIcon || STEP_ICONS.tool;

          this.recordToolCall(call);

          yield JSON.stringify({ type: 'step', icon: toolIcon, message: `${description}...` }) + '\n';
        }

          const results = await this.executeToolCallGroup(group, userId);

        for (const { call, resultData } of results) {
          if (resultData.includes('error')) {
            yield JSON.stringify({
              type: 'step',
              icon: STEP_ICONS.error,
              message: 'ביצוע השלב נכשל עקב מגבלות אבטחה או שגיאת שרת.',
            }) + '\n';
          } else {
            yield JSON.stringify({ type: 'step', icon: STEP_ICONS.success, message: 'השלב בוצע בהצלחה!' }) + '\n';
          }

          await this.agentSessionService.saveMessage(userId, session.id, 'tool', this.truncateForStorage(resultData), { toolCallId: call.id });
        }
        }
      } else {
        let accumulatedResponse = '';
        let firstTokenAt: number | null = null;
        const streamStart = Date.now();

        try {
          const stream = this.llmService.generateStream({
            prompt,
            systemContext: dynamicSystemContext,
            messageHistory: history,
            tools,
            providerOverride: provider,
            modelOverride: model,
            image,
          });

          for await (const chunk of stream) {
            if (firstTokenAt === null) {
              firstTokenAt = Date.now();
            }
            accumulatedResponse += chunk;
            yield JSON.stringify({ type: 'token', content: chunk }) + '\n';
          }
        } catch (error) {
          this.logger.error('Failed to stream response from LLM Service', error);
          throw error;
        }

        const streamEnd = Date.now();
        const componentCount = (accumulatedResponse.match(/```component[\s\S]*?```/gi) ?? []).length;
        const runtimeSelection = this.llmService.getRuntimeSelection(provider, model);

        this.logger.log(
          `[AdminAgentStream] userId=${userId} sessionId=${session.id} provider=${runtimeSelection.provider} model=${runtimeSelection.model} firstTokenMs=${firstTokenAt !== null ? firstTokenAt - streamStart : 'N/A'} totalMs=${streamEnd - streamStart} tokens=${accumulatedResponse.length} components=${componentCount}`,
        );

        if (accumulatedResponse.length > 0) {
          await this.agentSessionService.saveMessage(userId, session.id, 'assistant', accumulatedResponse);
        }
        return;
      }
    }

    yield JSON.stringify({
      type: 'token',
      content: 'תקשורת הסוכן הופסקה עקב הגעה למספר האיטרציות המרבי.',
    }) + '\n';
  }

  private getDynamicSystemContext(userId: number, provider?: LlmProvider, model?: string, prompt?: string): string {
    const runtimeSelection = this.llmService.getRuntimeSelection(provider, model);
    const includeGenui = prompt ? this.shouldIncludeGenui(prompt) : true;

    return buildSystemContext({ includeGenui })
      .replace(/{{CURRENT_USER_ID}}/g, String(userId))
      .replace(/{{CURRENT_TIME}}/g, new Date().toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' }))
      .replace(/{{CURRENT_LLM_PROVIDER}}/g, runtimeSelection.provider)
      .replace(/{{CURRENT_LLM_MODEL}}/g, runtimeSelection.model);
  }

  private shouldIncludeGenui(prompt: string): boolean {
    const lowerPrompt = prompt.toLowerCase();
    return VISUAL_TRIGGER_KEYWORDS.some((kw) => lowerPrompt.includes(kw.toLowerCase()));
  }

  private isParallelSafeTool(functionName: string): boolean {
    if (PARALLEL_UNSAFE_TOOL_NAMES.has(functionName)) {
      return false;
    }

    const endpoint = this.swaggerToolsParser.getEndpoint(functionName);

    return endpoint?.method.toUpperCase() === 'GET';
  }

  private groupToolCallsForExecution(toolCalls: LlmToolCall[]): LlmToolCall[][] {
    const groups: LlmToolCall[][] = [];
    let currentSafeGroup: LlmToolCall[] = [];

    for (const call of toolCalls) {
      if (this.isParallelSafeTool(call.function.name)) {
        currentSafeGroup.push(call);
        continue;
      }

      if (currentSafeGroup.length > 0) {
        groups.push(currentSafeGroup);
        currentSafeGroup = [];
      }

      groups.push([call]);
    }

    if (currentSafeGroup.length > 0) {
      groups.push(currentSafeGroup);
    }

    return groups;
  }

  private async executeToolCallGroup(calls: LlmToolCall[], userId: number): Promise<ToolCallResult[]> {
    if (calls.length === 1) {
      return [await this.executeToolCallSafely(calls[0], userId)];
    }

    this.logger.log(`Executing ${calls.length} read-only tools in parallel.`);

    return Promise.all(calls.map((call) => {
      return this.executeToolCallSafely(call, userId);
    }));
  }

  private async executeToolCallSafely(call: LlmToolCall, userId: number): Promise<ToolCallResult> {
    try {
      const resultData = await this.agentToolExecutorService.executeToolCall(call, userId);

      return { call, resultData };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown tool execution error';

      this.logger.error(`Tool execution failed in ${call.function.name}: ${message}`);

      return {
        call,
        resultData: JSON.stringify({
          error: true,
          message: 'Tool execution failed',
          toolName: call.function.name,
          details: message,
        }),
      };
    }
  }

  private resetToolCallCounter(): void {
    this.toolCallCounter.clear();
  }

  private toolCallKey(call: LlmToolCall): string {
    // Normalize arguments so semantically equal JSON (different key order,
    // extra whitespace) collapses to the same key. If the args are malformed
    // JSON we keep the raw string so the breaker still trips on identical
    // garbage repeats rather than treating them as distinct.
    let normalizedArgs = call.function.arguments || '{}';
    try {
      const parsed = JSON.parse(normalizedArgs);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const sortedKeys = Object.keys(parsed).sort();
        const sorted: Record<string, unknown> = {};
        for (const key of sortedKeys) {
          sorted[key] = parsed[key];
        }
        normalizedArgs = JSON.stringify(sorted);
      } else {
        normalizedArgs = JSON.stringify(parsed);
      }
    } catch {
      // keep raw
    }
    return `${call.function.name}::${normalizedArgs}`;
  }

  private recordToolCall(call: LlmToolCall): number {
    const key = this.toolCallKey(call);
    const next = (this.toolCallCounter.get(key) ?? 0) + 1;
    this.toolCallCounter.set(key, next);
    return next;
  }

  private findDuplicateToolCall(calls: LlmToolCall[]): LlmToolCall | null {
    for (const call of calls) {
      const key = this.toolCallKey(call);
      const count = this.toolCallCounter.get(key) ?? 0;
      // MAX_DUPLICATE_TOOL_CALLS=2 means "allow 2 calls, trip on the 3rd".
      // A pending call with count >= 3 would be the 3rd (or later) execution.
      if (count > MAX_DUPLICATE_TOOL_CALLS) {
        return call;
      }
    }
    return null;
  }

  private breakerErrorMessage(toolName: string, args: Record<string, unknown>): string {
    const argsJson = Object.keys(args).length > 0 ? JSON.stringify(args) : '{}';
    return `הסוכן ניסה לקרוא שוב ושוב לכלי "${toolName}" עם אותם ארגומנטים (${argsJson}) ונעצר. כנראה שהמודל לא הצליח להפיק תשובה סופית. אפשר לנסות שוב עם מודל אחר או לנסח את הבקשה מחדש.`;
  }

  private parseToolArguments(call: LlmToolCall): Record<string, unknown> {
    try {
      return JSON.parse(call.function.arguments || '{}') as Record<string, unknown>;
    } catch {
      return {};
    }
  }

  private truncateForStorage(content: string, maxBytes = 50_000): string {
    const fullBuffer = Buffer.from(content, 'utf8');
    if (fullBuffer.byteLength <= maxBytes) {
      return content;
    }

    const originalLength = content.length;
    const marker = JSON.stringify({
      _truncated: true,
      _originalLength: originalLength,
      _note: 'Tool result was truncated before persistence to stay within message-size limits. Re-call the tool with a narrower filter if the full payload is required.',
    });

    const previewBudget = maxBytes - Buffer.byteLength(marker, 'utf8');

    // Backtrack from the cut point to find a valid UTF-8 character boundary.
    // Continuation bytes are 10xxxxxx (0x80–0xBF); we must not end the slice
    // in the middle of a multi-byte sequence.
    let boundary = previewBudget;
    while (boundary > 0 && (fullBuffer[boundary] & 0xC0) === 0x80) {
      boundary--;
    }

    const preview = fullBuffer.subarray(0, boundary).toString('utf8');

    return `${preview}${marker}`;
  }
}
