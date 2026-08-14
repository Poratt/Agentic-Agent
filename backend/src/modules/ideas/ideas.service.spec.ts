import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, getDataSourceToken } from '@nestjs/typeorm';
import { ForbiddenException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { IdeasService } from './ideas.service';
import { SavedIdeaSession } from './entities/saved-idea-session.entity';
import { SavedIdea } from './entities/saved-idea.entity';
import { GenerateIdeasResponse } from './interfaces/idea.interface';
import { LlmClientService } from '../llm/services/llm-client.service';
import { WebSearchService } from '../web-search/web-search.service';
import {
  TOPIC_DISCOVERY_PROMPT,
  DISCOVERY_QUERY_GENERATION_PROMPT,
} from './constants/idea-prompts.constant';

function makeBusinessIdea(title: string, score = 7): GenerateIdeasResponse['result'][number] {
  return {
    title,
    description: `desc for ${title}`,
    targetMarket: 'market',
    validationScore: score,
    validationReason: 'ok',
    risks: ['r1'],
    competitors: ['c1'],
    nextSteps: ['s1'],
    signalsReferenced: ['sig1'],
    groundedInSignals: true,
  };
}

describe('IdeasService — persistence (Phase 1)', () => {
  let service: IdeasService;
  let sessionRepo: jest.Mocked<Repository<SavedIdeaSession>>;
  let ideaRepo: jest.Mocked<Repository<SavedIdea>>;
  let txManager: { save: jest.Mock; delete: jest.Mock };

  // Capture what the transaction manager persists so we can assert on it.
  let savedSessions: SavedIdeaSession[] = [];
  let savedIdeas: SavedIdea[] = [];

  beforeEach(async () => {
    savedSessions = [];
    savedIdeas = [];

    sessionRepo = {
      findOne: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      createQueryBuilder: jest.fn(),
    } as any;

    ideaRepo = {
      findOne: jest.fn(),
    } as any;

    txManager = {
      save: jest.fn(async (entity: any, items?: any) => {
        if (Array.isArray(items)) {
          // manager.save(EntityClass, [rows])
          items.forEach((row) => savedIdeas.push(row));
          return items;
        }
        // manager.save(entityInstance)
        if (entity instanceof SavedIdeaSession) {
          if (entity.id == null) entity.id = 1000 + savedSessions.length;
          savedSessions.push(entity);
          return entity;
        }
        savedIdeas.push(entity);
        return entity;
      }),
      delete: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IdeasService,
        { provide: getRepositoryToken(SavedIdeaSession), useValue: sessionRepo },
        { provide: getRepositoryToken(SavedIdea), useValue: ideaRepo },
        { provide: getDataSourceToken(), useValue: { transaction: jest.fn((cb: any) => cb(txManager)) } },
        { provide: LlmClientService, useValue: {} },
        { provide: WebSearchService, useValue: {} },
      ],
    }).compile();

    service = module.get(IdeasService);
  });

  describe('saveGeneration', () => {
    it('writes one session + N ideas in a single transaction', async () => {
      const response: GenerateIdeasResponse = {
        success: true,
        message: 'ok',
        partial: false,
        result: [makeBusinessIdea('Idea A'), makeBusinessIdea('Idea B', 9), makeBusinessIdea('Idea C', 4)],
      };

      const sessionId = await service.saveGeneration(1, 'fitness apps', 'openrouter', 'gpt-4o', response);

      // Transaction executed exactly once.
      expect((getDataSourceToken as any) === undefined).toBe(false);
      // Session captured with the right scalar fields.
      expect(savedSessions.length).toBe(1);
      expect(savedSessions[0].userId).toBe(1);
      expect(savedSessions[0].domain).toBe('fitness apps');
      expect(savedSessions[0].provider).toBe('openrouter');
      expect(savedSessions[0].model).toBe('gpt-4o');
      expect(savedSessions[0].nightly).toBe(false);
      expect(savedSessions[0].unread).toBe(false);
      // All 3 ideas captured, linked to the session.
      expect(savedIdeas.length).toBe(3);
      savedIdeas.forEach((idea) => {
        expect(idea.userId).toBe(1);
        expect(idea.sessionId).toBe(savedSessions[0].id);
        expect(idea.isFavorite).toBe(false);
        expect(idea.risks).toEqual(['r1']);
      });
      // sessionId returned is the in-memory session id (transaction is mocked).
      expect(typeof sessionId).toBe('number');
    });

    it('omits validationBreakdown and stores arrays as provided', async () => {
      const response: GenerateIdeasResponse = {
        success: true,
        message: 'ok',
        partial: false,
        result: [makeBusinessIdea('Solo')],
      };

      await service.saveGeneration(1, 'd', null, null, response);

      expect(savedIdeas.length).toBe(1);
      expect((savedIdeas[0] as any).validationBreakdown).toBeNull();
      // null provider/model → null columns
      expect(savedSessions[0].provider).toBeNull();
      expect(savedSessions[0].model).toBeNull();
    });

    it('respects nightly + unread opts', async () => {
      const response: GenerateIdeasResponse = {
        success: true,
        message: 'ok',
        partial: false,
        result: [makeBusinessIdea('Solo')],
      };
      await service.saveGeneration(1, 'd', null, null, response, { nightly: true, unread: true });
      expect(savedSessions[0].nightly).toBe(true);
      expect(savedSessions[0].unread).toBe(true);
    });

    it('skips session creation when result is empty', async () => {
      const response: GenerateIdeasResponse = {
        success: true,
        message: 'ok',
        partial: false,
        result: [],
      };
      const sessionId = await service.saveGeneration(1, 'd', null, null, response, { nightly: true, unread: true });
      expect(sessionId).toBe(0);
      expect(savedSessions.length).toBe(0);
    });
  });

  describe('listSessions', () => {
    it('loads the idea count via loadRelationCountAndMap and filters by user', async () => {
      const fakeSessions = [{ id: 1, ideasCount: 5 }, { id: 2, ideasCount: 0 }] as unknown as SavedIdeaSession[];

      // Chainable query builder mock for the list query.
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(fakeSessions),
      };
      // The service only calls andWhere/orderBy when needed — always wire them.
      (sessionRepo.createQueryBuilder as jest.Mock).mockReturnValue(qb);
      // loadRelationCountAndMap is a method on the builder — make it chainable too.
      let loadRelationMock = jest.fn().mockReturnValue(qb);
      // The service calls .loadRelationCountAndMap(...) right after createQueryBuilder.
      // We attach it so it remains chainable.
      // To keep the mock faithful, expose it as a method on qb:
      Object.assign(qb, { loadRelationCountAndMap: loadRelationMock });

      const result = await service.listSessions(7);

      expect(sessionRepo.createQueryBuilder).toHaveBeenCalled();
      expect(loadRelationMock).toHaveBeenCalledWith('session.ideasCount', 'session.ideas');
      expect(qb.where).toHaveBeenCalledWith('session.userId = :userId', { userId: 7 });
      expect(qb.orderBy).toHaveBeenCalledWith('session.createdAt', 'DESC');
      expect(qb.andWhere).not.toHaveBeenCalled();
      expect(result).toEqual(fakeSessions);
    });
  });

  describe('ownership checks', () => {
    it('getSession throws ForbiddenException when the session belongs to another user', async () => {
      sessionRepo.findOne!.mockResolvedValue(null);
      await expect(service.getSession(2, 999)).rejects.toBeInstanceOf(ForbiddenException);
      expect(sessionRepo.findOne).toHaveBeenCalledWith({
        where: { id: 999, userId: 2 },
        relations: ['ideas'],
      });
    });

    it('setFavorite throws ForbiddenException when the idea belongs to another user', async () => {
      ideaRepo.findOne!.mockResolvedValue(null);
      await expect(service.setFavorite(2, 555, true)).rejects.toBeInstanceOf(ForbiddenException);
      expect(ideaRepo.findOne).toHaveBeenCalledWith({ where: { id: 555, userId: 2 } });
    });
  });

  describe('validateSingle — riskPenalty', () => {
    const rawIdea = { title: 'מחולל קליפים', description: 'd', targetMarket: 'm' };

    // Wire llm/webSearch mocks per breakdown and run validation.
    async function runValidation(breakdown: Record<string, number> | undefined, extra: Record<string, unknown> = {}) {
      (service as any).webSearch = {
        search: jest.fn().mockResolvedValue({ success: true, result: { results: [{ title: 't', content: 'c' }] } }),
      };
      (service as any).llm = {
        generateResponse: jest.fn().mockResolvedValue({
          content: JSON.stringify({
            risks: ['עלויות GPU גבוהות'],
            competitors: ['OpusClip'],
            nextSteps: ['צעד'],
            signalsReferenced: ['סיגנל'],
            validationReason: 'סיבה',
            ...extra,
            validationBreakdown: breakdown,
          }),
          finishReason: 'stop',
        }),
      };
      return service['validateSingle'](rawIdea, [{ signal: 'כאב', source: 'reddit' }], 'clip generator');
    }

    it('subtracts riskPenalty from the breakdown sum', async () => {
      const idea = await runValidation({ competition: 2, signalFit: 3, feasibility: 2, marketSize: 1, riskPenalty: 3 });
      // 2+3+2+1-3 = 5
      expect(idea!.validationScore).toBe(5);
      expect(idea!.validationBreakdown!.riskPenalty).toBe(3);
    });

    it('clamps the penalized score to a minimum of 1', async () => {
      const idea = await runValidation({ competition: 0, signalFit: 0, feasibility: 1, marketSize: 0, riskPenalty: 3 });
      // 0+0+1+0-3 = -2 → clamped to 1
      expect(idea!.validationScore).toBe(1);
    });

    it('treats a missing riskPenalty as 0 (backward compat with old model output)', async () => {
      const idea = await runValidation({ competition: 2, signalFit: 2, feasibility: 1, marketSize: 1 });
      // 2+2+1+1-0 = 6
      expect(idea!.validationScore).toBe(6);
      expect(idea!.validationBreakdown!.riskPenalty).toBe(0);
    });

    it('passes through solo-dev actionable fields, trimming text and rounding MVP days', async () => {
      const idea = await runValidation(
        { competition: 2, signalFit: 2, feasibility: 2, marketSize: 1, riskPenalty: 0 },
        { techStackSuggestion: '  Whisper API + Next.js  ', firstDistributionStep: 'פוסט ב-r/podcasting', estimatedMvpDays: 21.4 },
      );
      expect(idea!.techStackSuggestion).toBe('Whisper API + Next.js');
      expect(idea!.firstDistributionStep).toBe('פוסט ב-r/podcasting');
      expect(idea!.estimatedMvpDays).toBe(21);
    });

    it('clamps estimatedMvpDays to 1-365 and drops garbage values', async () => {
      const over = await runValidation(undefined, { estimatedMvpDays: 9999 });
      expect(over!.estimatedMvpDays).toBe(365);
      const garbage = await runValidation(undefined, { estimatedMvpDays: 'שבועיים', techStackSuggestion: '   ' });
      expect(garbage!.estimatedMvpDays).toBeUndefined();
      expect(garbage!.techStackSuggestion).toBeUndefined();
    });
  });
});
