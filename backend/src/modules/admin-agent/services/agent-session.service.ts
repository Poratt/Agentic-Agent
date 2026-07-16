import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, In, MoreThanOrEqual } from 'typeorm';
import { ChatSession } from '../entities/chat-session.entity';
import { ChatMessage } from '../entities/chat-message.entity';
import { LlmMessage } from '../../llm/types/llm.types';

export interface SaveMessageOptions {
  toolCallId?: string | null;
  imageUrl?: string | null;
  renderSpec?: string | null;
}

const DEFAULT_SESSION_TITLE = 'שיחה חדשה...';
const LEGACY_DEFAULT_SESSION_TITLES = ['New chat...', 'New chat'];

@Injectable()
export class AgentSessionService {
  constructor(
    @InjectRepository(ChatSession)
    private readonly chatSessionRepository: Repository<ChatSession>,
    @InjectRepository(ChatMessage)
    private readonly chatMessageRepository: Repository<ChatMessage>,
  ) {}

  async getSessions(userId: number, limit?: number): Promise<ChatSession[]> {
    const query = this.chatSessionRepository
      .createQueryBuilder('session')
      .innerJoin('session.messages', 'message')
      .where('session.userId = :userId', { userId })
      .orderBy('session.updatedAt', 'DESC')
      .distinct(true);

    if (limit) {
      query.take(limit);
    }

    const sessions = await query.getMany();
    return sessions.map((session) => {
      return this.normalizeSessionTitle(session);
    });
  }

  async getSessionMessages(
    sessionId: number,
    userId: number,
  ): Promise<{ messages: ChatMessage[]; hasMoreImages: boolean }> {
    const session = await this.chatSessionRepository.findOne({
      where: { id: sessionId, userId },
    });

    if (!session) {
      throw new ForbiddenException('אינך מורשה לגשת לשיחה זו או שהיא אינה קיימת.');
    }

    const messages = await this.chatMessageRepository.find({
      where: {
        sessionId,
        role: In(['user', 'assistant']),
        toolCallId: IsNull(),
      },
      order: { createdAt: 'ASC', id: 'ASC' },
    });

    let imageCount = 0;
    for (const msg of messages) {
      if (msg.imageUrl) {
        imageCount++;
        if (imageCount > 20) {
          msg.imageUrl = null;
        }
      }
    }

    return { messages, hasMoreImages: imageCount > 20 };
  }

  async getMessageImages(
    messageIds: number[],
    userId: number,
  ): Promise<Record<number, string | null>> {
    const messages = await this.chatMessageRepository.find({
      where: {
        id: In(messageIds),
        userId,
      },
    });

    return Object.fromEntries(messages.map((m) => [m.id, m.imageUrl]));
  }

  async createSession(userId: number): Promise<ChatSession> {
    const session = this.chatSessionRepository.create({
      userId,
      title: DEFAULT_SESSION_TITLE,
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

  async deleteSessionMessage(sessionId: number, messageId: number, userId: number): Promise<void> {
    const session = await this.chatSessionRepository.findOne({
      where: { id: sessionId, userId },
    });

    if (!session) {
      throw new ForbiddenException('You are not allowed to delete messages from this chat session.');
    }

    const message = await this.chatMessageRepository.findOne({
      where: { id: messageId, sessionId, userId },
    });

    if (!message) {
      throw new ForbiddenException('You are not allowed to delete this message or it does not exist.');
    }

    await this.chatMessageRepository.delete({
      sessionId,
      userId,
      id: MoreThanOrEqual(message.id),
    });
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
    const genericGreetings = [
      'hi',
      'hello',
      'hey',
      'good morning',
      'good evening',
      'היי',
      'שלום',
      'הלו',
      'אהלן',
      'בוקר טוב',
      'ערב טוב',
    ];
    const normalizedPrompt = prompt.trim().toLowerCase();
    const isGreeting = genericGreetings.includes(normalizedPrompt) || normalizedPrompt.length <= 3;

    if (this.isDefaultSessionTitle(session.title) && prompt && !isGreeting) {
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
    options: SaveMessageOptions = {},
  ): Promise<ChatMessage> {
    const message = this.chatMessageRepository.create({
      userId,
      sessionId,
      role,
      content,
      toolCallId: options.toolCallId ?? null,
      imageUrl: options.imageUrl ?? null,
      renderSpec: options.renderSpec ?? null,
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

  private isDefaultSessionTitle(title: string): boolean {
    return title === DEFAULT_SESSION_TITLE || LEGACY_DEFAULT_SESSION_TITLES.includes(title);
  }

  private normalizeSessionTitle(session: ChatSession): ChatSession {
    if (LEGACY_DEFAULT_SESSION_TITLES.includes(session.title)) {
      session.title = DEFAULT_SESSION_TITLE;
    }
    return session;
  }
}
