import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AgentSessionService } from './agent-session.service';
import { ChatSession } from '../entities/chat-session.entity';
import { ChatMessage } from '../entities/chat-message.entity';
import { ForbiddenException } from '@nestjs/common';

function mockRepo(overrides: Record<string, any> = {}) {
  return {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    create: jest.fn((args) => args),
    save: jest.fn((args) => Promise.resolve({ id: 1, ...args })),
    delete: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('AgentSessionService', () => {
  let service: AgentSessionService;
  let sessionRepo: ReturnType<typeof mockRepo>;
  let messageRepo: ReturnType<typeof mockRepo>;

  beforeEach(async () => {
    sessionRepo = mockRepo();
    messageRepo = mockRepo();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgentSessionService,
        { provide: getRepositoryToken(ChatSession), useValue: sessionRepo },
        { provide: getRepositoryToken(ChatMessage), useValue: messageRepo },
      ],
    }).compile();

    service = module.get(AgentSessionService);
  });

  describe('saveMessage with imageUrl', () => {
    it('persists imageUrl when provided in options', async () => {
      const img = 'data:image/png;base64,abc123';
      messageRepo.save.mockImplementation(async (msg) => msg);

      const result = await service.saveMessage(1, 1, 'user', 'test', { imageUrl: img });

      expect(messageRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ imageUrl: img }),
      );
      expect(result.imageUrl).toBe(img);
    });

    it('sets imageUrl to null when options omit it (assistant message)', async () => {
      messageRepo.save.mockImplementation(async (msg) => msg);

      const result = await service.saveMessage(1, 1, 'assistant', 'reply');

      expect(messageRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ imageUrl: null }),
      );
      expect(result.imageUrl).toBeNull();
    });

    it('sets imageUrl to null explicitly when options.imageUrl is null', async () => {
      messageRepo.save.mockImplementation(async (msg) => msg);

      const result = await service.saveMessage(1, 1, 'user', 'test', { imageUrl: null });

      expect(result.imageUrl).toBeNull();
    });
  });

  describe('getSessionMessages — imageUrl handling', () => {
    it('returns imageUrl on messages that have one', async () => {
      sessionRepo.findOne.mockResolvedValue({ id: 1, userId: 1 });
      const img = 'data:image/jpeg;base64,xyz';
      messageRepo.find.mockResolvedValue([
        { id: 1, imageUrl: img, role: 'user', toolCallId: null },
        { id: 2, imageUrl: null, role: 'assistant', toolCallId: null },
      ]);

      const { messages, hasMoreImages } = await service.getSessionMessages(1, 1);

      expect(messages[0].imageUrl).toBe(img);
      expect(messages[1].imageUrl).toBeNull();
      expect(hasMoreImages).toBe(false);
    });

    it('nullifies imageUrl on messages beyond the 20th image', async () => {
      sessionRepo.findOne.mockResolvedValue({ id: 1, userId: 1 });
      const msgs = Array.from({ length: 25 }, (_, i) => ({
        id: i + 1,
        imageUrl: 'data:image/png;base64,chunk',
        role: 'user' as const,
        toolCallId: null,
      }));
      messageRepo.find.mockResolvedValue(msgs);

      const { messages, hasMoreImages } = await service.getSessionMessages(1, 1);

      expect(hasMoreImages).toBe(true);
      // First 20 retain imageUrl
      for (let i = 0; i < 20; i++) {
        expect(messages[i].imageUrl).toBe('data:image/png;base64,chunk');
      }
      // Messages 21-25 have imageUrl nullified
      for (let i = 20; i < 25; i++) {
        expect(messages[i].imageUrl).toBeNull();
      }
    });

    it('returns hasMoreImages: false when exactly 20 images exist', async () => {
      sessionRepo.findOne.mockResolvedValue({ id: 1, userId: 1 });
      const msgs = Array.from({ length: 20 }, (_, i) => ({
        id: i + 1,
        imageUrl: 'data:image/png;base64,chunk',
        role: 'user' as const,
        toolCallId: null,
      }));
      messageRepo.find.mockResolvedValue(msgs);

      const { hasMoreImages } = await service.getSessionMessages(1, 1);

      expect(hasMoreImages).toBe(false);
    });

    it('returns hasMoreImages: false when no images exist', async () => {
      sessionRepo.findOne.mockResolvedValue({ id: 1, userId: 1 });
      messageRepo.find.mockResolvedValue([
        { id: 1, imageUrl: null, role: 'user', toolCallId: null },
      ]);

      const { hasMoreImages } = await service.getSessionMessages(1, 1);

      expect(hasMoreImages).toBe(false);
    });

    it('throws ForbiddenException when session not found', async () => {
      sessionRepo.findOne.mockResolvedValue(null);

      await expect(service.getSessionMessages(999, 1)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getMessageImages', () => {
    it('returns a map of message ID to imageUrl', async () => {
      messageRepo.find.mockResolvedValue([
        { id: 10, imageUrl: 'data:image/png;base64,a' },
        { id: 20, imageUrl: null },
        { id: 30, imageUrl: 'data:image/jpeg;base64,b' },
      ]);

      const result = await service.getMessageImages([10, 20, 30], 1);

      expect(result).toEqual({
        10: 'data:image/png;base64,a',
        20: null,
        30: 'data:image/jpeg;base64,b',
      });
    });

    it('returns empty map when no messages match', async () => {
      messageRepo.find.mockResolvedValue([]);

      const result = await service.getMessageImages([999], 1);

      expect(result).toEqual({});
    });
  });
});
