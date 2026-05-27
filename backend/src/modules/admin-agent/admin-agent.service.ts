import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatMessage } from './entities/chat-message.entity';
import { LlmService } from './llm.service';
import { SwaggerToolsParser } from './swagger-tools.parser';
import { IChatHistoryItem } from './interfaces/chat-history-item.interface';

@Injectable()
export class AdminAgentService implements OnModuleInit {
  private readonly logger = new Logger(AdminAgentService.name);

  constructor(
    @InjectRepository(ChatMessage)
    private readonly chatMessageRepository: Repository<ChatMessage>,
    private readonly llmService: LlmService,
    private readonly swaggerToolsParser: SwaggerToolsParser,
  ) {}

  onModuleInit(): void {
    this.logger.log('AdminAgentService initialized. Streaming mode prepared without tools.');
    this.printParsedSwaggerTools();
  }

  private printParsedSwaggerTools(): void {
    try {
      const tools = this.swaggerToolsParser.getTools();
      this.logger.log(`--- START SWAGGER-TOOLS-PARSER OUTPUT: LOADED ${tools.length} TOOLS ---`);
      
      // eslint-disable-next-line no-console
      console.log(JSON.stringify(tools, null, 2));

      tools.forEach((tool) => {
        const functionName = tool.function?.name;
        if (functionName) {
          const endpoint = this.swaggerToolsParser.getEndpoint(functionName);
          // eslint-disable-next-line no-console
          console.log(`Tool Name: "${functionName}" | Endpoint:`, endpoint);
        }
      });

      this.logger.log('--- END OF PARSED SWAGGER TOOLS OUTPUT ---');
    } catch (error: any) {
      this.logger.error(`Failed to execute swagger tools parser logging: ${error.message}`);
    }
  }

  async queryDatabase(prompt: string, userId: number): Promise<string> {
    const userMessage = this.chatMessageRepository.create({
      userId,
      role: 'user',
      content: prompt,
      toolCallId: null,
    });
    await this.chatMessageRepository.save(userMessage);

    const history = await this.chatMessageRepository.find({
      where: { userId },
      order: { createdAt: 'ASC' },
    });

    const formattedHistory: IChatHistoryItem[] = history
      .filter((message) => {
        return message.role === 'user' || message.role === 'assistant';
      })
      .map((message) => {
        return {
          role: message.role as 'user' | 'assistant',
          content: message.content,
        };
      });

    const response = await this.llmService.generateResponse({
      prompt,
      messageHistory: formattedHistory,
    });

    const assistantContent = response.content || '';
    const assistantMessage = this.chatMessageRepository.create({
      userId,
      role: 'assistant',
      content: assistantContent,
      toolCallId: null,
    });
    await this.chatMessageRepository.save(assistantMessage);

    return assistantContent;
  }

  async *queryDatabaseStream(prompt: string, userId: number): AsyncIterable<string> {
    const userMessage = this.chatMessageRepository.create({
      userId,
      role: 'user',
      content: prompt,
      toolCallId: null,
    });
    await this.chatMessageRepository.save(userMessage);

    const history = await this.chatMessageRepository.find({
      where: { userId },
      order: { createdAt: 'ASC' },
    });

    const formattedHistory: IChatHistoryItem[] = history
      .filter((message) => {
        return message.role === 'user' || message.role === 'assistant';
      })
      .map((message) => {
        return {
          role: message.role as 'user' | 'assistant',
          content: message.content,
        };
      });

    let accumulatedResponse = '';

    try {
      const stream = this.llmService.generateStream({
        prompt,
        messageHistory: formattedHistory,
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
      const assistantMessage = this.chatMessageRepository.create({
        userId,
        role: 'assistant',
        content: accumulatedResponse,
        toolCallId: null,
      });
      await this.chatMessageRepository.save(assistantMessage);
    }
  }
}