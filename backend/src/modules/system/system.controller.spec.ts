import { Test, TestingModule } from '@nestjs/testing';
import { SystemController } from './system.controller';
import { SystemService } from './system.service';

describe('SystemController', () => {
  let controller: SystemController;
  let systemService: jest.Mocked<SystemService>;

  beforeEach(async () => {
    systemService = {
      getSystemStatus: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SystemController],
      providers: [
        { provide: SystemService, useValue: systemService },
      ],
    }).compile();

    controller = module.get(SystemController);
    jest.clearAllMocks();
  });

  describe('GET /system/status', () => {
    it('calls systemService.getSystemStatus', async () => {
      const response = { success: true, result: { totalUsers: 5, activeSessions: 2, isSwaggerUpToDate: true } };
      systemService.getSystemStatus.mockResolvedValue(response as any);

      const result = await controller.getStatus();

      expect(systemService.getSystemStatus).toHaveBeenCalled();
      expect(result).toEqual(response);
    });
  });
});
