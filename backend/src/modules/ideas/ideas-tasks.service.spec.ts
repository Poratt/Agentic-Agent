import { Test, TestingModule } from '@nestjs/testing';
import { IdeasTasksService } from './ideas-tasks.service';
import { IdeasService } from './ideas.service';
import { UsersService } from '../users/users.service';
import { LlmProviderService } from '../llm-provider/llm-provider.service';
import { LlmProviderConfigService } from '../llm/services/llm-provider-config.service';
import { User } from '../users/entities/user.entity';

function makeAdmin(): User {
  return { id: 1, role: 1 as any } as User;
}

function makeGroundedResult(domain: string, score = 7) {
  return {
    topic: { domain, searchQuery: `${domain} search`, rationale: `pain point for ${domain}` },
    response: {
      success: true,
      message: 'ok',
      partial: false,
      result: [{
        title: `${domain} idea`,
        description: 'd',
        targetMarket: 'm',
        validationScore: score,
        validationReason: 'r',
        risks: [],
        competitors: [],
        nextSteps: [],
        signalsReferenced: [],
        groundedInSignals: true,
      }],
    },
  };
}

describe('IdeasTasksService — nightly cron (Phase 3 + discovery + hard gate)', () => {
  let service: IdeasTasksService;
  let ideasService: jest.Mocked<
    Pick<IdeasService, 'generateIdeas' | 'saveGeneration' | 'discoverTopics' | 'generateGroundedIdeasForCron'>
  >;
  let usersService: jest.Mocked<Pick<UsersService, 'findFirstAdmin'>>;
  let llmProviderService: jest.Mocked<Pick<LlmProviderService, 'findFirstActiveTextModel'>>;

  const originalEnv = { ...process.env };

  beforeEach(async () => {
    process.env = { ...originalEnv };
    delete process.env.IDEAS_NIGHTLY_ENABLED;
    delete process.env.IDEAS_NIGHTLY_COUNT;
    delete process.env.IDEAS_NIGHTLY_TOPIC_COUNT;
    delete process.env.IDEAS_NIGHTLY_MODEL;

    ideasService = {
      generateIdeas: jest.fn(),
      saveGeneration: jest.fn(),
      discoverTopics: jest.fn(),
      generateGroundedIdeasForCron: jest.fn(),
    };
    usersService = {
      findFirstAdmin: jest.fn(),
    };
    llmProviderService = {
      findFirstActiveTextModel: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IdeasTasksService,
        { provide: IdeasService, useValue: ideasService },
        { provide: UsersService, useValue: usersService },
        { provide: LlmProviderService, useValue: llmProviderService },
        { provide: LlmProviderConfigService, useValue: { getActiveProvider: jest.fn(), getActiveModel: jest.fn() } },
      ],
    }).compile();

    service = module.get(IdeasTasksService);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('no-ops when IDEAS_NIGHTLY_ENABLED is not exactly "true"', async () => {
    process.env.IDEAS_NIGHTLY_ENABLED = 'false';

    await service.runNightly();

    expect(usersService.findFirstAdmin).not.toHaveBeenCalled();
    expect(ideasService.discoverTopics).not.toHaveBeenCalled();
    expect(ideasService.generateGroundedIdeasForCron).not.toHaveBeenCalled();
    expect(ideasService.generateIdeas).not.toHaveBeenCalled();
    expect(ideasService.saveGeneration).not.toHaveBeenCalled();
  });

  it('skips when grounded cron returns 0 results', async () => {
    process.env.IDEAS_NIGHTLY_ENABLED = 'true';

    usersService.findFirstAdmin.mockResolvedValue(makeAdmin());
    llmProviderService.findFirstActiveTextModel.mockResolvedValue({ provider: 'openrouter', model: 'gpt-4o' });
    ideasService.generateGroundedIdeasForCron.mockResolvedValue([]);

    await service.runNightly();

    expect(ideasService.saveGeneration).not.toHaveBeenCalled();
  });

  it('calls generateGroundedIdeasForCron then saves each grounded result', async () => {
    process.env.IDEAS_NIGHTLY_ENABLED = 'true';
    process.env.IDEAS_NIGHTLY_MODEL = '';

    usersService.findFirstAdmin.mockResolvedValue(makeAdmin());
    llmProviderService.findFirstActiveTextModel.mockResolvedValue({ provider: 'openrouter', model: 'gpt-4o' });
    ideasService.generateGroundedIdeasForCron.mockResolvedValue([
      makeGroundedResult('ניהול חשבוניות לפרילנסרים', 7),
      makeGroundedResult('אנליטיקה למפתחים', 5),
    ]);
    ideasService.saveGeneration.mockResolvedValue(1);

    await service.runNightly();

    expect(ideasService.discoverTopics).not.toHaveBeenCalled();
    expect(ideasService.generateIdeas).not.toHaveBeenCalled();
    expect(ideasService.generateGroundedIdeasForCron).toHaveBeenCalledTimes(1);
    expect(ideasService.generateGroundedIdeasForCron).toHaveBeenCalledWith(5, 1, 'openrouter', 'gpt-4o');
    expect(ideasService.saveGeneration).toHaveBeenCalledTimes(2);

    const calls = (ideasService.saveGeneration as jest.Mock).mock.calls;
    expect(calls[0][1]).toBe('ניהול חשבוניות לפרילנסרים');
    expect(calls[1][1]).toBe('אנליטיקה למפתחים');
    for (const call of calls) {
      expect(call[0]).toBe(1); // admin.id
      expect(call[5]).toEqual({ nightly: true, unread: true });
    }
  });

  it('uses IDEAS_NIGHTLY_MODEL env override when present', async () => {
    process.env.IDEAS_NIGHTLY_ENABLED = 'true';
    process.env.IDEAS_NIGHTLY_MODEL = 'agnes-ai/agnes-text-2.0';

    usersService.findFirstAdmin.mockResolvedValue(makeAdmin());
    ideasService.generateGroundedIdeasForCron.mockResolvedValue([
      makeGroundedResult('כלי AI', 6),
    ]);
    ideasService.saveGeneration.mockResolvedValue(1);

    await service.runNightly();

    expect(llmProviderService.findFirstActiveTextModel).not.toHaveBeenCalled();
    expect(ideasService.generateGroundedIdeasForCron).toHaveBeenCalledWith(5, 1, 'agnes-ai', 'agnes-text-2.0');
    expect(ideasService.saveGeneration).toHaveBeenCalledWith(
      1,
      'כלי AI',
      'agnes-ai',
      'agnes-text-2.0',
      expect.objectContaining({ success: true }),
      { nightly: true, unread: true },
    );
  });

  it('uses IDEAS_NIGHTLY_COUNT env override as target grounded count', async () => {
    process.env.IDEAS_NIGHTLY_ENABLED = 'true';
    process.env.IDEAS_NIGHTLY_COUNT = '8';
    process.env.IDEAS_NIGHTLY_MODEL = '';

    usersService.findFirstAdmin.mockResolvedValue(makeAdmin());
    llmProviderService.findFirstActiveTextModel.mockResolvedValue({ provider: 'openrouter', model: 'gpt-4o' });
    ideasService.generateGroundedIdeasForCron.mockResolvedValue([]);

    await service.runNightly();

    expect(ideasService.generateGroundedIdeasForCron).toHaveBeenCalledWith(8, 1, 'openrouter', 'gpt-4o');
  });

  it('isolates per-topic save failures — one failing save does not abort the rest', async () => {
    process.env.IDEAS_NIGHTLY_ENABLED = 'true';
    process.env.IDEAS_NIGHTLY_MODEL = '';

    usersService.findFirstAdmin.mockResolvedValue(makeAdmin());
    llmProviderService.findFirstActiveTextModel.mockResolvedValue({ provider: 'openrouter', model: 'gpt-4o' });
    ideasService.generateGroundedIdeasForCron.mockResolvedValue([
      makeGroundedResult('topic-a', 6),
      makeGroundedResult('topic-b', 7),
      makeGroundedResult('topic-c', 5),
    ]);
    ideasService.saveGeneration
      .mockRejectedValueOnce(new Error('DB write failed'))
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(2);

    await service.runNightly();

    // All 3 grounded results reached saveGeneration; one failed (caught),
    // the other two succeeded.
    expect(ideasService.saveGeneration).toHaveBeenCalledTimes(3);
    expect((ideasService.saveGeneration as jest.Mock).mock.calls[0][1]).toBe('topic-a');
    expect((ideasService.saveGeneration as jest.Mock).mock.calls[1][1]).toBe('topic-b');
    expect((ideasService.saveGeneration as jest.Mock).mock.calls[2][1]).toBe('topic-c');
  });
});
