import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { LlmService } from '../llm/llm.service';
import { AgentSessionService } from './services/agent-session.service';
import { AgentToolExecutorService } from './services/agent-tool-executor.service';
import { ChatSession } from './entities/chat-session.entity';
import { ChatMessage } from './entities/chat-message.entity';
import { SYSTEM_CONTEXT } from './constants/system-context.constant';
import { SwaggerToolsParser } from './services/swagger-tools.parser';
import type { LlmProvider, LlmToolCall } from '../llm/types/llm.types';

const MAX_ITERATIONS = 10;
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

  async getSessionMessages(sessionId: number, userId: number): Promise<ChatMessage[]> {
    return this.agentSessionService.getSessionMessages(sessionId, userId);
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
    const session = await this.agentSessionService.getOrCreateSession(userId, requestedSessionId);

    if (prompt && prompt.trim().length > 0) {
      await this.agentSessionService.updateSessionTitleIfDefault(session, prompt);
    }
    await this.agentSessionService.saveMessage(userId, session.id, 'user', prompt);

    const tools = this.swaggerToolsParser.getTools();
    const dynamicSystemContext = this.getDynamicSystemContext(userId, provider, model);

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
        await this.agentSessionService.saveMessage(
          userId,
          session.id,
          'assistant',
          JSON.stringify(llmResponse.toolCalls),
          'YES_TOOL_CALLS',
        );

        const groups = this.groupToolCallsForExecution(llmResponse.toolCalls);

        for (const group of groups) {
          const results = await this.executeToolCallGroup(group, userId);

          for (const { call, resultData } of results) {
            await this.agentSessionService.saveMessage(userId, session.id, 'tool', resultData, call.id);
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

    const session = await this.agentSessionService.getOrCreateSession(userId, requestedSessionId);

    if (prompt && prompt.trim().length > 0) {
      await this.agentSessionService.updateSessionTitleIfDefault(session, prompt);
    }
    await this.agentSessionService.saveMessage(userId, session.id, 'user', prompt);

    const tools = this.swaggerToolsParser.getTools();
    const dynamicSystemContext = this.getDynamicSystemContext(userId, provider, model);

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
        await this.agentSessionService.saveMessage(
          userId,
          session.id,
          'assistant',
          JSON.stringify(llmResponse.toolCalls),
          'YES_TOOL_CALLS',
        );

        const groups = this.groupToolCallsForExecution(llmResponse.toolCalls);

        for (const group of groups) {
          for (const call of group) {
          const args = this.parseToolArguments(call);
          const description = this.agentToolExecutorService.getSemanticActionDescription(call.function.name, args);
          const endpoint = this.swaggerToolsParser.getEndpoint(call.function.name);
          const toolIcon = endpoint?.toolIcon || STEP_ICONS.tool;

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

          await this.agentSessionService.saveMessage(userId, session.id, 'tool', resultData, call.id);
        }
        }
      } else {
        let accumulatedResponse = '';
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
            accumulatedResponse += chunk;
            yield JSON.stringify({ type: 'token', content: chunk }) + '\n';
          }
        } catch (error) {
          this.logger.error('Failed to stream response from LLM Service', error);
          throw error;
        }

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

  private getDynamicSystemContext(userId: number, provider?: LlmProvider, model?: string): string {
    const runtimeSelection = this.llmService.getRuntimeSelection(provider, model);

    return SYSTEM_CONTEXT
      .replace(/{{CURRENT_USER_ID}}/g, String(userId))
      .replace(/{{CURRENT_TIME}}/g, new Date().toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' }))
      .replace(/{{CURRENT_LLM_PROVIDER}}/g, runtimeSelection.provider)
      .replace(/{{CURRENT_LLM_MODEL}}/g, runtimeSelection.model);
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

  private parseToolArguments(call: LlmToolCall): Record<string, unknown> {
    try {
      return JSON.parse(call.function.arguments || '{}') as Record<string, unknown>;
    } catch {
      return {};
    }
  }
}
