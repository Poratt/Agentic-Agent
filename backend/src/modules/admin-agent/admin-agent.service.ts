import { Injectable, Logger, OnModuleInit, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { JwtService } from '@nestjs/jwt';
import { firstValueFrom } from 'rxjs';
import { User } from '../users/entities/user.entity';
import { LlmService, LlmToolCall, LlmToolSchema } from './llm.service';
import { ChatMessage } from './entities/chat-message.entity';
import { SwaggerToolsParser } from './swagger-tools.parser';
import { AgentResponseDto } from './dto/agent-response.dto';
import { UserRole } from '../../core/enums/user-role.enum';

const MAX_ITERATIONS = 5;

type MessageHistoryItem =
  | { role: 'user' | 'assistant'; content: string }
  | { role: 'tool'; content: string; tool_call_id: string };

@Injectable()
export class AdminAgent implements OnModuleInit {
  private readonly logger = new Logger(AdminAgent.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(ChatMessage)
    private readonly chatMessageRepository: Repository<ChatMessage>,
    private readonly llmService: LlmService,
    private readonly swaggerToolsParser: SwaggerToolsParser,
    private readonly httpService: HttpService,
    private readonly jwtService: JwtService,
  ) {}

  onModuleInit(): void {
    const enabled =
      process.env.SWAGGER_TOOLS_DEBUG === '1' ||
      process.env.SWAGGER_TOOLS_DEBUG === 'true' ||
      process.env.SWAGGER_TOOLS_DEBUG === 'yes';
    if (!enabled) return;

    const tools = this.swaggerToolsParser.getTools();
    this.logger.warn(`[SWAGGER_TOOLS_DEBUG] Loaded ${tools.length} swagger tools. Printing full schema to console...`);
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(tools, null, 2));
  }

  private generateSystemCookie(userId: number, email: string, role: UserRole): string {
    const payload = { sub: userId, email, role };
    const token = this.jwtService.sign(payload, { expiresIn: '5m' });
    return `access_token=${token}`;
  }

  private async getHistory(userId: number, limit = 10): Promise<MessageHistoryItem[]> {
    const messages = await this.chatMessageRepository.find({
      where: { userId },
      order: { createdAt: 'ASC' },
      take: limit,
    });

    return messages.map((m) => {
      if (m.role === 'tool') {
        return {
          role: 'tool' as const,
          content: m.content,
          tool_call_id: m.toolCallId || '',
        };
      }
      return {
        role: m.role as 'user' | 'assistant',
        content: m.content,
      };
    });
  }

  private async saveMessage(userId: number, role: 'user' | 'assistant' | 'tool', content: string, toolCallId?: string) {
    const msg = this.chatMessageRepository.create({
      userId,
      role,
      content,
      toolCallId: toolCallId || null,
    });
    await this.chatMessageRepository.save(msg);
  }

  private async executeLocalTool(toolName: string, args: Record<string, any>, cookie: string): Promise<string> {
    const endpoint = this.swaggerToolsParser.getEndpoint(toolName);
    if (!endpoint) {
      return JSON.stringify({ error: `Tool endpoint ${toolName} not found in swagger specification.` });
    }

    const { targetUrl, body, queryParams } = this.swaggerToolsParser.resolveArguments(
      endpoint.path,
      endpoint.method,
      args,
      'http://localhost:3000',
    );

    this.logger.log(`Agent executing internal tool call: [${endpoint.method.toUpperCase()}] ${targetUrl}`);

    try {
      const response = await firstValueFrom(
        this.httpService.request({
          method: endpoint.method as any,
          url: targetUrl,
          data: body,
          params: queryParams,
          headers: {
            Cookie: cookie,
            'Content-Type': 'application/json',
          },
          withCredentials: true,
        }),
      );

      return JSON.stringify(response.data);
    } catch (error: any) {
      this.logger.error(`Local tool execution failed: ${error.message}`, error.response?.data);
      return JSON.stringify({
        error: `Tool execution failed: ${error.message}`,
        details: error.response?.data || null,
      });
    }
  }

  async queryDatabase(prompt: string, userId: number): Promise<AgentResponseDto> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User context not found inside system database.');
    }

    const cookie = this.generateSystemCookie(user.id, user.email, user.role);
    const history = await this.getHistory(user.id);
    const tools = this.swaggerToolsParser.getTools();

    await this.saveMessage(user.id, 'user', prompt);

    const systemContext = `You are a highly efficient Administration AI Assistant. 
    You have direct, authorized access to read and modify the database using the provided Swagger tools. 
    Always reply in Hebrew, concisely, neatly formatted in Markdown tables or lists where applicable.
    If you make any modification, confirm the action in your final response.`;

    const activeHistory: MessageHistoryItem[] = [
      ...history,
      { role: 'user' as const, content: prompt }
    ];

    for (let iteration = 1; iteration <= MAX_ITERATIONS; iteration = iteration + 1) {
      this.logger.log(`Agent loop iteration ${iteration}/${MAX_ITERATIONS}`);

      const response = await this.llmService.generateResponse({
        prompt,
        systemContext,
        tools,
        messageHistory: activeHistory,
      });

      if (response.toolCalls && response.toolCalls.length > 0) {
        activeHistory.push({
          role: 'assistant' as const,
          content: response.content || 'Executing system tools...',
        });

        for (const toolCall of response.toolCalls) {
          const toolName = toolCall.function.name;
          const args = JSON.parse(toolCall.function.arguments || '{}');
          
          const toolResult = await this.executeLocalTool(toolName, args, cookie);
          
          if (toolCall.id) {
            activeHistory.push({
              role: 'tool' as const,
              content: toolResult,
              tool_call_id: toolCall.id,
            });
            await this.saveMessage(user.id, 'tool', toolResult, toolCall.id);
          }
        }
      } else {
        const finalMessage = response.content || 'מצטער, לא הצלחתי לייצר תשובה.';
        await this.saveMessage(user.id, 'assistant', finalMessage);
        return { message: finalMessage };
      }
    }

    const timeoutMsg = 'הסוכן הגיע למגבלת הריצות המקסימלית ללא הגעה לתשובה סופית. אנא נסה למקד את השאלה.';
    await this.saveMessage(user.id, 'assistant', timeoutMsg);
    return { message: timeoutMsg };
  }

  async *queryDatabaseStream(prompt: string, userId: number): AsyncIterable<string> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      yield 'שגיאה: משתמש לא נמצא.';
      return;
    }

    const cookie = this.generateSystemCookie(user.id, user.email, user.role);
    const history = await this.getHistory(user.id);
    const tools = this.swaggerToolsParser.getTools();

    await this.saveMessage(user.id, 'user', prompt);

    const systemContext = `You are a highly efficient Administration AI Assistant. 
    You have direct, authorized access to read and modify the database using the provided Swagger tools. 
    Always reply in Hebrew, concisely, neatly formatted in Markdown tables or lists where applicable.
    If you make any modification, confirm the action in your final response.`;

    const activeHistory: MessageHistoryItem[] = [
      ...history,
      { role: 'user' as const, content: prompt }
    ];

    for (let iteration = 1; iteration <= MAX_ITERATIONS; iteration = iteration + 1) {
      this.logger.log(`Agent Stream loop iteration ${iteration}/${MAX_ITERATIONS}`);

      const response = await this.llmService.generateResponse({
        prompt,
        systemContext,
        tools,
        messageHistory: activeHistory,
      });

      if (response.toolCalls && response.toolCalls.length > 0) {
        activeHistory.push({
          role: 'assistant' as const,
          content: response.content || 'Executing system tools...',
        });

        for (const toolCall of response.toolCalls) {
          const toolName = toolCall.function.name;
          const args = JSON.parse(toolCall.function.arguments || '{}');
          
          yield `\n[מפעיל כלי מערכתי: ${toolName}...]\n`;
          const toolResult = await this.executeLocalTool(toolName, args, cookie);
          
          if (toolCall.id) {
            activeHistory.push({
              role: 'tool' as const,
              content: toolResult,
              tool_call_id: toolCall.id,
            });
            await this.saveMessage(user.id, 'tool', toolResult, toolCall.id);
          }
        }
      } else {
        let fullContent = '';
        const tokenStream = this.llmService.generateStream({
          prompt,
          systemContext,
          messageHistory: activeHistory,
        });

        for await (const token of tokenStream) {
          fullContent = fullContent + token;
          yield token;
        }

        await this.saveMessage(user.id, 'assistant', fullContent);
        return;
      }
    }

    yield 'הסוכן הגיע למגבלת הריצות המקסימלית ללא הגעה לתשובה סופית.';
  }
}