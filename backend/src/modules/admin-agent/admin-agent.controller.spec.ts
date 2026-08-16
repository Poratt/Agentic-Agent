import { Test, TestingModule } from '@nestjs/testing';
import { AdminAgentController } from './admin-agent.controller';
import { AdminAgentService } from './admin-agent.service';
import { AgentToolExecutorService } from './services/agent-tool-executor.service';
import { AgentAuditService } from './services/agent-audit.service';
import { AuditAction } from './entities/agent-action-audit-log.entity';
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

  describe('confirmAction — ServiceResultContainer shape', () => {
    let ctrl: AdminAgentController;
    let toolExecutor: {
      getPendingActionOwner: jest.Mock;
      inspectPendingAction: jest.Mock;
      confirmPendingActionById: jest.Mock;
      cancelPendingActionById: jest.Mock;
      executeToolCall: jest.Mock;
    };
    let audit: { log: jest.Mock };

    beforeEach(async () => {
      toolExecutor = {
        getPendingActionOwner: jest.fn(),
        inspectPendingAction: jest.fn(),
        confirmPendingActionById: jest.fn(),
        cancelPendingActionById: jest.fn(),
        executeToolCall: jest.fn(),
      };
      audit = { log: jest.fn() };

      const module: TestingModule = await Test.createTestingModule({
        controllers: [AdminAgentController],
        providers: [
          { provide: AdminAgentService, useValue: {} },
          { provide: AgentToolExecutorService, useValue: toolExecutor },
          { provide: AgentAuditService, useValue: audit },
        ],
      }).compile();

      ctrl = module.get(AdminAgentController);
    });

    it('confirmed action returns {success, message, result} with the tool result', async () => {
      toolExecutor.getPendingActionOwner.mockReturnValue({ userId: 1, sessionId: 5 });
      toolExecutor.inspectPendingAction.mockReturnValue({ status: 'ok' });
      toolExecutor.confirmPendingActionById.mockReturnValue({
        functionName: 'db_delete_user',
        sessionId: 5,
        args: { id: 3 },
      });
      toolExecutor.executeToolCall.mockResolvedValue('deleted 1 row');
      const req = { user: { sub: 1 }, ip: '127.0.0.1' } as any;

      const result = await ctrl.confirmAction({ actionId: 'a1', confirmed: true } as any, req);

      expect(result).toEqual({
        success: true,
        message: 'הפעולה אושרה ובוצעה.',
        result: 'deleted 1 row',
      });
      expect(toolExecutor.executeToolCall).toHaveBeenCalledTimes(1);
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ actionType: AuditAction.ACTION_CONFIRMED, actionId: 'a1' }),
      );
    });

    it('cancelled action returns {success, message, result:{cancelled}} — no top-level cancelled key', async () => {
      toolExecutor.getPendingActionOwner.mockReturnValue({ userId: 1, sessionId: 5 });
      toolExecutor.cancelPendingActionById.mockReturnValue({
        functionName: 'db_delete_user',
        sessionId: 5,
      });
      const req = { user: { sub: 1 }, ip: '127.0.0.1' } as any;

      const result = await ctrl.confirmAction({ actionId: 'a2', confirmed: false } as any, req);

      expect(result).toEqual({
        success: true,
        message: 'הפעולה בוטלה.',
        result: { cancelled: true },
      });
      expect(result).not.toHaveProperty('cancelled');
      expect(toolExecutor.executeToolCall).not.toHaveBeenCalled();
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ actionType: AuditAction.ACTION_CANCELLED, actionId: 'a2' }),
      );
    });

    it('rejects a pending action owned by another user with 403', async () => {
      toolExecutor.getPendingActionOwner.mockReturnValue({ userId: 2, sessionId: 5 });
      const req = { user: { sub: 1 }, ip: '127.0.0.1' } as any;

      await expect(ctrl.confirmAction({ actionId: 'a3', confirmed: true } as any, req)).rejects.toThrow(
        ForbiddenException,
      );
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ actionType: AuditAction.ACTION_UNAUTHORIZED_ACCESS_ATTEMPT }),
      );
    });

    it('rejects an expired pending action with 400', async () => {
      toolExecutor.getPendingActionOwner.mockReturnValue({ userId: 1, sessionId: 5 });
      toolExecutor.inspectPendingAction.mockReturnValue({ status: 'expired', action: null });
      const req = { user: { sub: 1 }, ip: '127.0.0.1' } as any;

      await expect(ctrl.confirmAction({ actionId: 'a4', confirmed: true } as any, req)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
