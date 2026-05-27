import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { LlmService } from './llm.service';
import { AgentSessionService } from './services/agent-session.service';
import { AgentToolExecutorService } from './services/agent-tool-executor.service';
import { ChatSession } from './entities/chat-session.entity';
import { ChatMessage } from './entities/chat-message.entity';
import { SYSTEM_CONTEXT } from './constants/system-context.constant';
import { SwaggerToolsParser } from './services/swagger-tools.parser';

const MAX_ITERATIONS = 5;

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
      this.logger.log(`------------------------ START SWAGGER-TOOLS-PARSER OUTPUT: LOADED ${tools.length} TOOLS ------------------------`);

      // eslint-disable-next-line no-console
      // console.log(JSON.stringify(tools, null, 2));
      const fnWidth = Math.max(...tools.map(fn => fn.function?.name.length || 0));

      tools.forEach((tool) => {
        const functionName = tool.function?.name;
        if (functionName) {
          const endpoint = this.swaggerToolsParser.getEndpoint(functionName);
          // eslint-disable-next-line no-console
          this.logger.log(`Tool Name: "${functionName.padEnd(fnWidth)}" | ${endpoint?.path}, ${endpoint?.method.toLocaleUpperCase()} `);
        }
      });

      this.logger.log('-------------------------------- END OF PARSED SWAGGER TOOLS OUTPUT --------------------------------');
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

  async queryDatabase(prompt: string, userId: number, requestedSessionId?: number): Promise<string> {
    const session = await this.agentSessionService.getOrCreateSession(userId, requestedSessionId);
    await this.agentSessionService.updateSessionTitleIfDefault(session, prompt);
    await this.agentSessionService.saveMessage(userId, session.id, 'user', prompt);

    const tools = this.swaggerToolsParser.getTools();
    const dynamicSystemContext = SYSTEM_CONTEXT.replace(/{{CURRENT_USER_ID}}/g, String(userId));

    for (let iteration = 0; iteration < MAX_ITERATIONS; iteration = iteration + 1) {
      const history = await this.agentSessionService.loadHistory(session.id, userId);

      const llmResponse = await this.llmService.generateResponse({
        prompt,
        systemContext: dynamicSystemContext,
        messageHistory: history,
        tools,
      });

      if (llmResponse.toolCalls && llmResponse.toolCalls.length > 0) {
        await this.agentSessionService.saveMessage(
          userId,
          session.id,
          'assistant',
          JSON.stringify(llmResponse.toolCalls),
          'YES_TOOL_CALLS',
        );

        for (const call of llmResponse.toolCalls) {
          const resultData = await this.agentToolExecutorService.executeToolCall(call, userId);
          await this.agentSessionService.saveMessage(userId, session.id, 'tool', resultData, call.id);
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
  ): AsyncIterable<string> {
    const session = await this.agentSessionService.getOrCreateSession(userId, requestedSessionId);
    await this.agentSessionService.updateSessionTitleIfDefault(session, prompt);
    await this.agentSessionService.saveMessage(userId, session.id, 'user', prompt);

    const tools = this.swaggerToolsParser.getTools();
    const dynamicSystemContext = SYSTEM_CONTEXT.replace(/{{CURRENT_USER_ID}}/g, String(userId));

    for (let iteration = 0; iteration < MAX_ITERATIONS; iteration = iteration + 1) {
      const history = await this.agentSessionService.loadHistory(session.id, userId);

      const llmResponse = await this.llmService.generateResponse({
        prompt,
        systemContext: dynamicSystemContext,
        messageHistory: history,
        tools,
      });

      if (llmResponse.toolCalls && llmResponse.toolCalls.length > 0) {
        await this.agentSessionService.saveMessage(
          userId,
          session.id,
          'assistant',
          JSON.stringify(llmResponse.toolCalls),
          'YES_TOOL_CALLS',
        );

        for (const call of llmResponse.toolCalls) {
          const resultData = await this.agentToolExecutorService.executeToolCall(call, userId);
          await this.agentSessionService.saveMessage(userId, session.id, 'tool', resultData, call.id);
        }
      } else {
        let accumulatedResponse = '';
        try {
          const stream = this.llmService.generateStream({
            prompt,
            systemContext: dynamicSystemContext,
            messageHistory: history,
            tools,
          });

          for await (const chunk of stream) {
            accumulatedResponse += chunk;
            yield chunk;
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

    yield 'תקשורת הסוכן הופסקה עקב הגעה למספר האיטרציות המרבי.';
  }
}