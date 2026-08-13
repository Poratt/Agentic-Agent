import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemService } from './system.service';
import { User } from '../users/entities/user.entity';
import { ChatSession } from '../admin-agent/entities/chat-session.entity';
import * as fs from 'fs';

jest.mock('fs');

describe('SystemService', () => {
  let service: SystemService;
  let usersRepo: jest.Mocked<Repository<User>>;
  let chatSessionRepo: jest.Mocked<Repository<ChatSession>>;

  beforeEach(async () => {
    usersRepo = { count: jest.fn() } as any;
    chatSessionRepo = { count: jest.fn() } as any;
    (fs.existsSync as jest.Mock).mockReturnValue(true);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SystemService,
        { provide: getRepositoryToken(User), useValue: usersRepo },
        { provide: getRepositoryToken(ChatSession), useValue: chatSessionRepo },
      ],
    }).compile();

    service = module.get(SystemService);
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getSystemStatus', () => {
    it('returns user count, session count, and swagger exists flag', async () => {
      usersRepo.count.mockResolvedValue(10);
      chatSessionRepo.count.mockResolvedValue(5);
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      const result = await service.getSystemStatus();

      expect(result.success).toBe(true);
      expect(result.result).toEqual({
        totalUsers: 10,
        activeSessions: 5,
        isSwaggerUpToDate: true,
      });
      expect(usersRepo.count).toHaveBeenCalled();
      expect(chatSessionRepo.count).toHaveBeenCalled();
      expect(fs.existsSync).toHaveBeenCalledWith('./swagger-spec.json');
    });

    it('handles missing swagger file (existsSync returns false)', async () => {
      usersRepo.count.mockResolvedValue(3);
      chatSessionRepo.count.mockResolvedValue(1);
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const result = await service.getSystemStatus();

      expect(result.success).toBe(true);
      expect(result.result).toEqual({
        totalUsers: 3,
        activeSessions: 1,
        isSwaggerUpToDate: false,
      });
    });
  });
});
