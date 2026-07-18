import { Test, TestingModule } from '@nestjs/testing';
import { AdminAgentController } from './admin-agent.controller';
import { AdminAgentService } from './admin-agent.service';
import { AgentToolExecutorService } from './services/agent-tool-executor.service';
import { AgentAuditService } from './services/agent-audit.service';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Response } from 'express';

function mockRes() {
  const headers: Record<string, string> = {};
  return {
    headers,
    setHeader: jest.fn((k: string, v: string) => { headers[k] = v; }),
  } as unknown as Response;
}

describe('AdminAgentController — image endpoints', () => {
  let controller: AdminAgentController;
  let adminAgentService: jest.Mocked<AdminAgentService>;

  beforeEach(async () => {
    adminAgentService = {
      getSessionMessages: jest.fn(),
      getMessageImages: jest.fn(),
      getSessions: jest.fn(),
      createSession: jest.fn(),
      deleteSession: jest.fn(),
      deleteSessionMessage: jest.fn(),
      queryDatabaseStream: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminAgentController],
      providers: [
        { provide: AdminAgentService, useValue: adminAgentService },
        { provide: AgentToolExecutorService, useValue: {} },
        { provide: AgentAuditService, useValue: {} },
      ],
    }).compile();

    controller = module.get(AdminAgentController);
  });

  describe('getSessionMessages — x-has-more-images header', () => {
    it('sets x-has-more-images to "true" when more than 20 images exist', async () => {
      adminAgentService.getSessionMessages.mockResolvedValue({
        messages: [],
        hasMoreImages: true,
      });
      const res = mockRes();
      const req = { user: { sub: 1 } } as any;

      await controller.getSessionMessages(1, req, res);

      expect(res.setHeader).toHaveBeenCalledWith('x-has-more-images', 'true');
    });

    it('sets x-has-more-images to "false" when 20 or fewer images exist', async () => {
      adminAgentService.getSessionMessages.mockResolvedValue({
        messages: [],
        hasMoreImages: false,
      });
      const res = mockRes();
      const req = { user: { sub: 1 } } as any;

      await controller.getSessionMessages(1, req, res);

      expect(res.setHeader).toHaveBeenCalledWith('x-has-more-images', 'false');
    });

    it('returns only the messages array (not the hasMoreImages flag in body)', async () => {
      const msgs = [{ id: 1, content: 'hi' }] as any;
      adminAgentService.getSessionMessages.mockResolvedValue({
        messages: msgs,
        hasMoreImages: true,
      });
      const res = mockRes();
      const req = { user: { sub: 1 } } as any;

      const result = await controller.getSessionMessages(1, req, res);

      expect(result).toEqual(msgs);
    });
  });

  describe('getMessageImages — validation', () => {
    it('rejects empty array with 400', async () => {
      const req = { user: { sub: 1 } } as any;

      await expect(controller.getMessageImages([], req)).rejects.toThrow(BadRequestException);
    });

    it('rejects non-array with 400', async () => {
      const req = { user: { sub: 1 } } as any;

      await expect(controller.getMessageImages('not-an-array' as any, req)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects more than 50 IDs with 400', async () => {
      const req = { user: { sub: 1 } } as any;
      const tooMany = Array.from({ length: 51 }, (_, i) => i + 1);

      await expect(controller.getMessageImages(tooMany, req)).rejects.toThrow(BadRequestException);
    });

    it('accepts exactly 50 IDs', async () => {
      adminAgentService.getMessageImages.mockResolvedValue({});
      const req = { user: { sub: 1 } } as any;
      const exactly50 = Array.from({ length: 50 }, (_, i) => i + 1);

      const result = await controller.getMessageImages(exactly50, req);

      expect(result).toEqual({});
      expect(adminAgentService.getMessageImages).toHaveBeenCalledWith(exactly50, 1);
    });

    it('passes userId from req.user.sub to the service', async () => {
      adminAgentService.getMessageImages.mockResolvedValue({ 10: 'data:image/png;base64,a' });
      const req = { user: { sub: 42 } } as any;

      await controller.getMessageImages([10], req);

      expect(adminAgentService.getMessageImages).toHaveBeenCalledWith([10], 42);
    });
  });
});
