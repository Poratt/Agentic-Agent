import { LlmTasksService } from './llm-tasks.service';
import { LlmHealthService } from './llm-health.service';
import { LlmProviderService } from '../../llm-provider/llm-provider.service';

function makeHealthService(): LlmHealthService {
  return {
    testAllModels: jest.fn(),
  } as unknown as LlmHealthService;
}

function makeProviderService(): LlmProviderService {
  return {
    deleteOldTestResults: jest.fn(),
  } as unknown as LlmProviderService;
}

function makeTasksService(overrides?: {
  healthService?: LlmHealthService;
  providerService?: LlmProviderService;
}): LlmTasksService {
  return new LlmTasksService(
    overrides?.healthService ?? makeHealthService(),
    overrides?.providerService ?? makeProviderService(),
  );
}

describe('LlmTasksService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('handleNightlyLlmHealthCheck', () => {
    it('calls testAllModels when LLM_HEALTH_CHECK_ENABLED is true', async () => {
      process.env.LLM_HEALTH_CHECK_ENABLED = 'true';
      const healthService = makeHealthService();
      (healthService.testAllModels as jest.Mock).mockResolvedValue({ success: true, result: [] });

      const tasksService = makeTasksService({ healthService });
      await tasksService.handleNightlyLlmHealthCheck();

      expect(healthService.testAllModels).toHaveBeenCalled();
    });

    it('no-ops when LLM_HEALTH_CHECK_ENABLED is not true', async () => {
      process.env.LLM_HEALTH_CHECK_ENABLED = 'false';
      const healthService = makeHealthService();

      const tasksService = makeTasksService({ healthService });
      await tasksService.handleNightlyLlmHealthCheck();

      expect(healthService.testAllModels).not.toHaveBeenCalled();
    });

    it('no-ops when LLM_HEALTH_CHECK_ENABLED is undefined', async () => {
      delete process.env.LLM_HEALTH_CHECK_ENABLED;
      const healthService = makeHealthService();

      const tasksService = makeTasksService({ healthService });
      await tasksService.handleNightlyLlmHealthCheck();

      expect(healthService.testAllModels).not.toHaveBeenCalled();
    });

    it('logs result count on success', async () => {
      process.env.LLM_HEALTH_CHECK_ENABLED = 'true';
      const healthService = makeHealthService();
      (healthService.testAllModels as jest.Mock).mockResolvedValue({
        success: true,
        result: [{ name: 'gpt-4o', provider: 'openrouter', available: true }],
      });
      const tasksService = makeTasksService({ healthService });
      const loggerSpy = jest.spyOn((tasksService as any).logger, 'log').mockImplementation();
      await tasksService.handleNightlyLlmHealthCheck();

      expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('1 models'));
      loggerSpy.mockRestore();
    });
  });

  describe('cleanupOldLlmModelTestResults', () => {
    it('calls deleteOldTestResults with retention days', async () => {
      const providerService = makeProviderService();
      (providerService.deleteOldTestResults as jest.Mock).mockResolvedValue(5);

      const tasksService = makeTasksService({ providerService });
      await tasksService.cleanupOldLlmModelTestResults();

      expect(providerService.deleteOldTestResults).toHaveBeenCalledWith(30);
    });

    it('logs deleted count', async () => {
      const providerService = makeProviderService();
      (providerService.deleteOldTestResults as jest.Mock).mockResolvedValue(12);
      const tasksService = makeTasksService({ providerService });
      const loggerSpy = jest.spyOn((tasksService as any).logger, 'log').mockImplementation();
      await tasksService.cleanupOldLlmModelTestResults();

      expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('12 rows'));
      loggerSpy.mockRestore();
    });
  });
});
