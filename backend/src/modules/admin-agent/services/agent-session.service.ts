import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, In } from 'typeorm';
import { ChatSession } from '../entities/chat-session.entity';
import { ChatMessage } from '../entities/chat-message.entity';
import { LlmMessage } from '../llm.service';

@Injectable()
export class AgentSessionService {
  constructor(
    @InjectRepository(ChatSession)
    private readonly chatSessionRepository: Repository<ChatSession>,
    @InjectRepository(ChatMessage)
    private readonly chatMessageRepository: Repository<ChatMessage>,
  ) {}

  async getSessions(userId: number, limit?: number): Promise<ChatSession[]> {
    return this.chatSessionRepository.find({
      where: { userId },
      order: { updatedAt: 'DESC' },
      take: limit,
    });
  }

  async getSessionMessages(sessionId: number, userId: number): Promise<ChatMessage[]> {
    const session = await this.chatSessionRepository.findOne({
      where: { id: sessionId, userId },
    });

    if (!session) {
      throw new ForbiddenException('אינך מורשה לגשת לשיחה זו או שהיא אינה קיימת.');
    }

    // שליפה ממוקדת של הודעות תצוגה אנושית בלבד (ללא קריאות כלים פנימיות וללא תשובות כלים)
    return this.chatMessageRepository.find({
      where: {
        sessionId,
        role: In(['user', 'assistant']),
        toolCallId: IsNull(), // שולף רק הודעות טקסט רגילות ומסנן את YES_TOOL_CALLS
      },
      order: { createdAt: 'ASC' },
    });
  }

  async createSession(userId: number): Promise<ChatSession> {
    const session = this.chatSessionRepository.create({
      userId,
      title: 'שיחה חדשה...',
    });
    return this.chatSessionRepository.save(session);
  }

  async deleteSession(sessionId: number, userId: number): Promise<void> {
    const session = await this.chatSessionRepository.findOne({
      where: { id: sessionId, userId },
    });

    if (!session) {
      throw new ForbiddenException('אינך מורשה למחוק שיחה זו או שהיא אינה קיימת.');
    }

    await this.chatSessionRepository.delete(sessionId);
  }

  async getOrCreateSession(userId: number, requestedSessionId?: number): Promise<ChatSession> {
    if (requestedSessionId) {
      const existing = await this.chatSessionRepository.findOne({
        where: { id: requestedSessionId, userId },
      });
      if (!existing) {
        throw new ForbiddenException('אינך מורשה לגשת לשיחה זו.');
      }
      return existing;
    }

    return this.createSession(userId);
  }

  async updateSessionTitleIfDefault(session: ChatSession, prompt: string): Promise<void> {
    const genericGreetings = ['היי', 'שלום', 'הלו', 'hi', 'hello', 'אהלן', 'בוקר טוב', 'ערב טוב'];
    const isGreeting = genericGreetings.includes(prompt.trim().toLowerCase()) || prompt.trim().length <= 3;

    if (session.title === 'שיחה חדשה...' && prompt && !isGreeting) {
      const cleanTitle = prompt.trim().substring(0, 30);
      session.title = cleanTitle.length > 28 ? `${cleanTitle}...` : cleanTitle;
      await this.chatSessionRepository.save(session);
    }
  }

  async saveMessage(
    userId: number,
    sessionId: number,
    role: 'user' | 'assistant' | 'tool',
    content: string,
    toolCallId: string | null = null,
  ): Promise<ChatMessage> {
    const message = this.chatMessageRepository.create({
      userId,
      sessionId,
      role,
      content,
      toolCallId,
    });
    return this.chatMessageRepository.save(message);
  }

  async loadHistory(sessionId: number, userId: number): Promise<LlmMessage[]> {
    const session = await this.chatSessionRepository.findOne({
      where: { id: sessionId, userId },
    });

    if (!session) {
      throw new ForbiddenException('גישה לשיחה זו נדחתה או שאינה קיימת.');
    }

    const rawHistory = await this.chatMessageRepository.find({
      where: { sessionId },
      order: { createdAt: 'ASC' },
    });

    const formatted: LlmMessage[] = [];

    rawHistory.forEach((msg) => {
      if (msg.role === 'user') {
        formatted.push({ role: 'user', content: msg.content });
      } else if (msg.role === 'tool' && msg.toolCallId) {
        formatted.push({ role: 'tool', tool_call_id: msg.toolCallId, content: msg.content });
      } else if (msg.role === 'assistant') {
        if (msg.toolCallId === 'YES_TOOL_CALLS') {
          formatted.push({
            role: 'assistant',
            content: null,
            tool_calls: JSON.parse(msg.content),
          });
        } else {
          formatted.push({ role: 'assistant', content: msg.content });
        }
      }
    });

    return formatted;
  }
}