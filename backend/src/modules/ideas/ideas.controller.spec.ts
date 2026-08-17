import { Test, TestingModule } from '@nestjs/testing';
import { IdeasController } from './ideas.controller';
import { IdeasService } from './ideas.service';
import { IdeasTasksService } from './ideas-tasks.service';
import { UnauthorizedException } from '@nestjs/common';
import { Observable, Subscriber, of } from 'rxjs';
import { MessageEvent } from '@nestjs/common';
import { RequestWithUser } from '../../core/interfaces/request-with-user.interface';

describe('IdeasController', () => {
  let controller: IdeasController;
  let ideasService: jest.Mocked<IdeasService>;
  let ideasTasksService: jest.Mocked<IdeasTasksService>;

  const mockReq = { user: { sub: 1, email: 'test@test.com', role: 1 } } as RequestWithUser;

  beforeEach(async () => {
    ideasService = {
      generateIdeas: jest.fn(),
      saveGeneration: jest.fn().mockResolvedValue(1),
      listSessions: jest.fn(),
      getSession: jest.fn(),
      deleteSession: jest.fn(),
      setFavorite: jest.fn(),
      unreadNightlyCount: jest.fn(),
      markNightlyRead: jest.fn(),
    } as any;

    ideasTasksService = {
      runNightly: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [IdeasController],
      providers: [
        { provide: IdeasService, useValue: ideasService },
        { provide: IdeasTasksService, useValue: ideasTasksService },
      ],
    }).compile();

    controller = module.get(IdeasController);
    jest.clearAllMocks();
  });

  describe('POST /ideas/generate', () => {
    it('calls ideasService.generateIdeas and saveGeneration', async () => {
      const response = { success: true, message: 'ok', partial: false, result: [{ title: 'Idea' }] };
      ideasService.generateIdeas.mockResolvedValue(response as any);

      const result = await controller.generate(mockReq, { domain: 'AI', count: 5 } as any);

      expect(ideasService.generateIdeas).toHaveBeenCalledWith('AI', 5, undefined, 1, undefined, undefined);
      expect(ideasService.saveGeneration).toHaveBeenCalledWith(1, 'AI', null, null, response);
      expect(result).toEqual(response);
    });
  });

  describe('GET /ideas/generate/stream', () => {
    it('returns an Observable that emits SSE events', (done) => {
      let capturedCallback: ((event: any) => void) | undefined;
      ideasService.generateIdeas.mockImplementation(
        async (_domain, _count, onProgress) => {
          const result = { success: true, result: [{ title: 'Idea' }] };
          onProgress?.({ phase: 'done', result } as any);
          return result as any;
        },
      );

      const obs = controller.stream(mockReq, { domain: 'AI', count: 5 } as any);
      expect(obs).toBeInstanceOf(Observable);

      const events: any[] = [];
      obs.subscribe({
        next: (e: MessageEvent) => {
          events.push(e);
        },
        complete: () => {
          expect(events.length).toBeGreaterThan(0);
          expect(ideasService.generateIdeas).toHaveBeenCalled();
          done();
        },
      });
    });
  });

  describe('GET /ideas/sessions', () => {
    it('calls ideasService.listSessions with userId and filters', async () => {
      const sessions = [{ id: 1 }];
      ideasService.listSessions.mockResolvedValue(sessions as any);

      const result = await controller.listSessions(mockReq, { nightly: true, favorites: false } as any);

      expect(ideasService.listSessions).toHaveBeenCalledWith(1, { nightly: true, favorites: false });
      expect(result.success).toBe(true);
      expect(result.message).toContain('נטענו');
      expect(result.result).toEqual(sessions);
    });

    it('throws UnauthorizedException when user is missing', async () => {
      await expect(controller.listSessions({ user: undefined } as any, {} as any)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('GET /ideas/sessions/:id', () => {
    it('calls ideasService.getSession with userId and sessionId', async () => {
      const session = { id: 42 };
      ideasService.getSession.mockResolvedValue(session as any);

      const result = await controller.getSession(mockReq, 42);

      expect(ideasService.getSession).toHaveBeenCalledWith(1, 42);
      expect(result.success).toBe(true);
      expect(result.result).toEqual(session);
    });

    it('throws UnauthorizedException when user is missing', async () => {
      await expect(controller.getSession({ user: undefined } as any, 42)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('DELETE /ideas/sessions/:id', () => {
    it('calls ideasService.deleteSession', async () => {
      ideasService.deleteSession.mockResolvedValue(undefined);

      await controller.deleteSession(mockReq, 7);

      expect(ideasService.deleteSession).toHaveBeenCalledWith(1, 7);
    });

    it('throws UnauthorizedException when user is missing', async () => {
      await expect(controller.deleteSession({ user: undefined } as any, 7)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('PATCH /ideas/ideas/:id', () => {
    it('calls ideasService.setFavorite', async () => {
      ideasService.setFavorite.mockResolvedValue(undefined);

      await controller.setFavorite(mockReq, 3, { isFavorite: true } as any);

      expect(ideasService.setFavorite).toHaveBeenCalledWith(1, 3, true);
    });

    it('throws UnauthorizedException when user is missing', async () => {
      await expect(controller.setFavorite({ user: undefined } as any, 3, { isFavorite: true } as any)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('GET /ideas/nightly/unread-count', () => {
    it('calls ideasService.unreadNightlyCount', async () => {
      ideasService.unreadNightlyCount.mockResolvedValue(3);

      const result = await controller.nightlyUnreadCount(mockReq);

      expect(ideasService.unreadNightlyCount).toHaveBeenCalledWith(1);
      expect(result.success).toBe(true);
      expect(result.result).toBe(3);
    });

    it('throws UnauthorizedException when user is missing', async () => {
      await expect(controller.nightlyUnreadCount({ user: undefined } as any)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('POST /ideas/nightly/mark-read', () => {
    it('calls ideasService.markNightlyRead', async () => {
      ideasService.markNightlyRead.mockResolvedValue(undefined);

      await controller.markNightlyRead(mockReq);

      expect(ideasService.markNightlyRead).toHaveBeenCalledWith(1);
    });

    it('throws UnauthorizedException when user is missing', async () => {
      await expect(controller.markNightlyRead({ user: undefined } as any)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('POST /ideas/nightly/trigger', () => {
    it('calls ideasTasksService.runNightly and returns success', async () => {
      ideasTasksService.runNightly.mockImplementation(async () => {});

      const result = await controller.triggerNightly(mockReq);

      expect(ideasTasksService.runNightly).toHaveBeenCalled();
      expect(result).toEqual({
        success: true,
        message: 'יצירת רעיונות לילית הופעלה. התוצאות יופיעו בהיסטוריה לאחר סיום.',
      });
    });
  });
});
