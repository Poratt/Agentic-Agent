import { Test, TestingModule } from '@nestjs/testing';
import { IdeasTasksService } from './ideas-tasks.service';
import { IdeasService } from './ideas.service';
import { UsersService } from '../users/users.service';
import { LlmProviderService } from '../llm-provider/llm-provider.service';
import { User } from '../users/entities/user.entity';

function makeAdmin(): User {
  return { id: 1, role: 1 as any } as User;
}

describe('IdeasTasksService — nightly cron (Phase 3)', () => {
  let service: IdeasTasksService;
  let ideasService: jest.Mocked<Pick<IdeasService, 'generateIdeas' | 'saveGeneration'>>;
  let usersService: jest.Mocked<Pick<UsersService, 'findFirstAdmin'>>;
  let llmProviderService: jest.Mocked<Pick<LlmProviderService, 'findFirstActiveTextModel'>>;

  const originalEnv = { ...process.env };

  beforeEach(async () => {
    process.env = { ...originalEnv };
    delete process.env.IDEAS_NIGHTLY_ENABLED;
    delete process.env.IDEAS_NIGHTLY_DOMAINS;
    delete process.env.IDEAS_NIGHTLY_COUNT;
    delete process.env.IDEAS_NIGHTLY_MODEL;

    ideasService = {
      generateIdeas: jest.fn(),
      saveGeneration: jest.fn(),
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
    process.env.IDEAS_NIGHTLY_DOMAINS = 'fitness apps';

    await service.runNightly();

    expect(ideasService.generateIdeas).not.toHaveBeenCalled();
    expect(usersService.findFirstAdmin).not.toHaveBeenCalled();
  });

  it('skips when IDEAS_NIGHTLY_DOMAINS is empty', async () => {
    process.env.IDEAS_NIGHTLY_ENABLED = 'true';
    process.env.IDEAS_NIGHTLY_DOMAINS = '   ';

    await service.runNightly();

    expect(ideasService.generateIdeas).not.toHaveBeenCalled();
  });

  it('loops all configured domains and calls saveGeneration once per domain with nightly+unread', async () => {
    process.env.IDEAS_NIGHTLY_ENABLED = 'true';
    process.env.IDEAS_NIGHTLY_DOMAINS = 'fitness apps; creator economy; climate tech';
    process.env.IDEAS_NIGHTLY_MODEL = '';

    usersService.findFirstAdmin.mockResolvedValue(makeAdmin());
    llmProviderService.findFirstActiveTextModel.mockResolvedValue({ provider: 'openrouter', model: 'gpt-4o' });
    ideasService.generateIdeas.mockResolvedValue({
      success: true,
      message: 'ok',
      partial: false,
      result: [{ title: 'A', description: 'd', targetMarket: 'm', validationScore: 7, validationReason: 'r', risks: [], competitors: [], nextSteps: [], signalsReferenced: [], groundedInSignals: true }],
    });
    ideasService.saveGeneration.mockResolvedValue(1);

    await service.runNightly();

    expect(ideasService.generateIdeas).toHaveBeenCalledTimes(3);
    expect(ideasService.saveGeneration).toHaveBeenCalledTimes(3);
    for (const call of (ideasService.saveGeneration as jest.Mock).mock.calls) {
      expect(call[0]).toBe(1); // admin.id
      expect(call[5]).toEqual({ nightly: true, unread: true });
    }
  });

  it('uses IDEAS_NIGHTLY_MODEL env override when present', async () => {
    process.env.IDEAS_NIGHTLY_ENABLED = 'true';
    process.env.IDEAS_NIGHTLY_DOMAINS = 'ai tools';
    process.env.IDEAS_NIGHTLY_MODEL = 'agnes-ai/agnes-text-2.0';

    usersService.findFirstAdmin.mockResolvedValue(makeAdmin());
    ideasService.generateIdeas.mockResolvedValue({
      success: true,
      message: 'ok',
      partial: false,
      result: [],
    });
    ideasService.saveGeneration.mockResolvedValue(1);

    await service.runNightly();

    expect(llmProviderService.findFirstActiveTextModel).not.toHaveBeenCalled();
    expect(ideasService.generateIdeas).toHaveBeenCalledWith(
      'ai tools',
      5,
      undefined,
      1,
      'agnes-ai',
      'agnes-text-2.0',
    );
  });
});