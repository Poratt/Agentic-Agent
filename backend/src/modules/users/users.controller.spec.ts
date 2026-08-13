import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UserRole } from '../../core/enums/user-role.enum';
import { JwtPayload } from '../../core/interfaces/jwt-payload.interface';

function makeAdminPayload(overrides: Partial<JwtPayload> = {}): JwtPayload {
  return {
    sub: 1,
    email: 'admin@test.com',
    role: UserRole.Admin,
    ...overrides,
  };
}

function makeUserPayload(overrides: Partial<JwtPayload> = {}): JwtPayload {
  return {
    sub: 2,
    email: 'user@test.com',
    role: UserRole.User,
    ...overrides,
  };
}

describe('UsersController', () => {
  let controller: UsersController;
  let service: jest.Mocked<UsersService>;

  beforeEach(async () => {
    service = {
      findAllSafe: jest.fn(),
      findOneSafe: jest.fn(),
      findFirstAdmin: jest.fn(),
      updateRole: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: service }],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    jest.clearAllMocks();
  });

  describe('GET /users — list', () => {
    it('returns list (admin only, guard passes)', async () => {
      const expected = {
        success: true,
        message: 'ok',
        result: [],
      };
      service.findAllSafe.mockResolvedValue(expected as any);

      const result = await controller.list();

      expect(service.findAllSafe).toHaveBeenCalled();
      expect(result).toEqual(expected);
    });
  });

  describe('GET /users/me — current user payload', () => {
    it('returns JWT payload from req.user', () => {
      const payload = makeAdminPayload();
      const req = { user: payload } as any;

      const result = controller.me(req);

      expect(result.success).toBe(true);
      expect(result.result).toEqual(payload);
    });
  });

  describe('GET /users/:id — getById', () => {
    it('admin can view any user', async () => {
      const adminReq = { user: makeAdminPayload() } as any;
      const container = {
        success: true,
        message: 'ok',
        result: { id: 5, email: 'other@test.com' },
      };
      service.findOneSafe.mockResolvedValue(container as any);

      const result = await controller.getById(5, adminReq);

      expect(service.findOneSafe).toHaveBeenCalledWith(5);
      expect(result).toEqual(container);
    });

    it('regular user can view self', async () => {
      const userReq = { user: makeUserPayload({ sub: 3 }) } as any;
      const container = {
        success: true,
        message: 'ok',
        result: { id: 3, email: 'user@test.com' },
      };
      service.findOneSafe.mockResolvedValue(container as any);

      const result = await controller.getById(3, userReq);

      expect(service.findOneSafe).toHaveBeenCalledWith(3);
      expect(result).toEqual(container);
    });

    it('regular user gets ForbiddenException viewing others', async () => {
      const userReq = { user: makeUserPayload({ sub: 2 }) } as any;

      await expect(controller.getById(5, userReq)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(service.findOneSafe).not.toHaveBeenCalled();
    });
  });

  describe('PATCH /users/:id — update', () => {
    it('admin updates user', async () => {
      const dto = { fullName: 'Updated' };
      const expected = {
        success: true,
        message: 'ok',
        result: { id: 4, fullName: 'Updated' },
      };
      service.update.mockResolvedValue(expected as any);

      const result = await controller.update(4, dto);

      expect(service.update).toHaveBeenCalledWith(4, dto);
      expect(result).toEqual(expected);
    });
  });

  describe('DELETE /users/:id — delete', () => {
    it('admin deletes user', async () => {
      const expected = {
        success: true,
        message: 'ok',
        result: { deleted: true },
      };
      service.delete.mockResolvedValue(expected as any);

      const result = await controller.delete(6);

      expect(service.delete).toHaveBeenCalledWith(6);
      expect(result).toEqual(expected);
    });
  });

  describe('PATCH /users/:id/role — updateRole', () => {
    it('admin updates role', async () => {
      const dto = { role: UserRole.Admin };
      const expected = {
        success: true,
        message: 'ok',
        result: { id: 7, role: UserRole.Admin },
      };
      service.updateRole.mockResolvedValue(expected as any);

      const result = await controller.updateRole(7, dto);

      expect(service.updateRole).toHaveBeenCalledWith(7, UserRole.Admin);
      expect(result).toEqual(expected);
    });
  });
});
