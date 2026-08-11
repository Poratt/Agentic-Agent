import { Test, TestingModule } from '@nestjs/testing';
import { IdeasTasksService } from './ideas-tasks.service';
import { IdeasService } from './ideas.service';
import { UsersService } from '../users/users.service';
import { LlmProviderService } from '../llm-provider/llm-provider.service';
import { User } from '../users/entities/user.entity';

function makeAdmin(): User {
  return { id: 1, role: 1 as any } as User;
}

describe('IdeasTasksService — nightly cron (Phase 3 + discovery)', () => {
  let service: IdeasTasksService;
  let ideasService: jest.Mocked<Pick<IdeasService, 'generateIdeas' | 'saveGeneration' | 'discoverTopics'>>;
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
    expect(ideasService.generateIdeas).not.toHaveBeenCalled();
    expect(ideasService.saveGeneration).not.toHaveBeenCalled();
  });

  it('skips when discovery returns 0 topics', async () => {
    process.env.IDEAS_NIGHTLY_ENABLED = 'true';

    usersService.findFirstAdmin.mockResolvedValue(makeAdmin());
    llmProviderService.findFirstActiveTextModel.mockResolvedValue({ provider: 'openrouter', model: 'gpt-4o' });
    ideasService.discoverTopics.mockResolvedValue([]);

    await service.runNightly();

    expect(ideasService.generateIdeas).not.toHaveBeenCalled();
    expect(ideasService.saveGeneration).not.toHaveBeenCalled();
  });

  it('calls discoverTopics then generates+saves for each discovered topic', async () => {
    process.env.IDEAS_NIGHTLY_ENABLED = 'true';
    process.env.IDEAS_NIGHTLY_MODEL = '';

    usersService.findFirstAdmin.mockResolvedValue(makeAdmin());
    llmProviderService.findFirstActiveTextModel.mockResolvedValue({ provider: 'openrouter', model: 'gpt-4o' });
    ideasService.discoverTopics.mockResolvedValue([
      { domain: 'freelancer invoicing', rationale: 'solo-friendly niche' },
      { domain: 'solo dev analytics', rationale: 'underserved market' },
    ]);
    ideasService.generateIdeas.mockResolvedValue({
      success: true,
      message: 'ok',
      partial: false,
      result: [{ title: 'A', description: 'd', targetMarket: 'm', validationScore: 7, validationReason: 'r', risks: [], competitors: [], nextSteps: [], signalsReferenced: [], groundedInSignals: true }],
    });
    ideasService.saveGeneration.mockResolvedValue(1);

    await service.runNightly();

    expect(ideasService.discoverTopics).toHaveBeenCalledTimes(1);
    expect(ideasService.discoverTopics).toHaveBeenCalledWith(3, 1, 'openrouter', 'gpt-4o');
    expect(ideasService.generateIdeas).toHaveBeenCalledTimes(2);
    expect(ideasService.saveGeneration).toHaveBeenCalledTimes(2);

    const calls = (ideasService.saveGeneration as jest.Mock).mock.calls;
    expect(calls[0][1]).toBe('freelancer invoicing');
    expect(calls[1][1]).toBe('solo dev analytics');
    for (const call of calls) {
      expect(call[0]).toBe(1); // admin.id
      expect(call[5]).toEqual({ nightly: true, unread: true });
    }
  });

  it('uses IDEAS_NIGHTLY_MODEL env override when present', async () => {
    process.env.IDEAS_NIGHTLY_ENABLED = 'true';
    process.env.IDEAS_NIGHTLY_MODEL = 'agnes-ai/agnes-text-2.0';

    usersService.findFirstAdmin.mockResolvedValue(makeAdmin());
    ideasService.discoverTopics.mockResolvedValue([{ domain: 'ai tools', rationale: 'solo dev niche' }]);
    ideasService.generateIdeas.mockResolvedValue({
      success: true,
      message: 'ok',
      partial: false,
      result: [],
    });
    ideasService.saveGeneration.mockResolvedValue(1);

    await service.runNightly();

    expect(llmProviderService.findFirstActiveTextModel).not.toHaveBeenCalled();
    expect(ideasService.discoverTopics).toHaveBeenCalledWith(3, 1, 'agnes-ai', 'agnes-text-2.0');
    expect(ideasService.generateIdeas).toHaveBeenCalledWith(
      'ai tools',
      5,
      undefined,
      1,
      'agnes-ai',
      'agnes-text-2.0',
    );
  });

  it('uses IDEAS_NIGHTLY_TOPIC_COUNT env override', async () => {
    process.env.IDEAS_NIGHTLY_ENABLED = 'true';
    process.env.IDEAS_NIGHTLY_TOPIC_COUNT = '5';
    process.env.IDEAS_NIGHTLY_MODEL = '';

    usersService.findFirstAdmin.mockResolvedValue(makeAdmin());
    llmProviderService.findFirstActiveTextModel.mockResolvedValue({ provider: 'openrouter', model: 'gpt-4o' });
    ideasService.discoverTopics.mockResolvedValue([]);
    ideasService.generateIdeas.mockResolvedValue({
      success: true,
      message: 'ok',
      partial: false,
      result: [],
    });

    await service.runNightly();

    expect(ideasService.discoverTopics).toHaveBeenCalledWith(5, 1, 'openrouter', 'gpt-4o');
  });

  it('isolates per-topic failures — one failing topic does not abort the rest', async () => {
    process.env.IDEAS_NIGHTLY_ENABLED = 'true';
    process.env.IDEAS_NIGHTLY_MODEL = '';

    usersService.findFirstAdmin.mockResolvedValue(makeAdmin());
    llmProviderService.findFirstActiveTextModel.mockResolvedValue({ provider: 'openrouter', model: 'gpt-4o' });
    ideasService.discoverTopics.mockResolvedValue([
      { domain: 'topic-a', rationale: 'pain point A' },
      { domain: 'topic-b', rationale: 'pain point B' },
      { domain: 'topic-c', rationale: 'pain point C' },
    ]);
    ideasService.generateIdeas
      .mockRejectedValueOnce(new Error('LLM timeout'))
      .mockResolvedValueOnce({
        success: true,
        message: 'ok',
        partial: false,
        result: [{ title: 'B', description: 'd', targetMarket: 'm', validationScore: 5, validationReason: 'r', risks: [], competitors: [], nextSteps: [], signalsReferenced: [], groundedInSignals: true }],
      })
      .mockResolvedValueOnce({
        success: true,
        message: 'ok',
        partial: false,
        result: [],
      });
    ideasService.saveGeneration.mockResolvedValue(1);

    await service.runNightly();

    // topic-a failed (caught), topic-b and topic-c both reached saveGeneration
    expect(ideasService.generateIdeas).toHaveBeenCalledTimes(3);
    expect(ideasService.saveGeneration).toHaveBeenCalledTimes(2);
    expect((ideasService.saveGeneration as jest.Mock).mock.calls[0][1]).toBe('topic-b');
    expect((ideasService.saveGeneration as jest.Mock).mock.calls[1][1]).toBe('topic-c');
  });
});
