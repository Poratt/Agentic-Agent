import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { AdminGuard } from './admin.guard';
import { JwtAuthGuard } from './jwt-auth.guard';
import { AppErrorCode } from '../errors/app-error-code';
import { UserRole } from '../enums/user-role.enum';
import { RequestWithUser } from '../interfaces/request-with-user.interface';

describe('AdminGuard', () => {
  let guard: AdminGuard;

  beforeEach(() => {
    jest.clearAllMocks();
    guard = new AdminGuard();
  });

  const mockContext = (user?: RequestWithUser['user']): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ user }) as RequestWithUser,
      }),
    }) as any;

  describe('canActivate', () => {
    it('should return true when user is Admin', async () => {
      jest
        .spyOn(JwtAuthGuard.prototype, 'canActivate')
        .mockResolvedValue(true as any);

      const ctx = mockContext({ sub: 1, email: 'a@b.com', role: UserRole.Admin });
      const result = await guard.canActivate(ctx);
      expect(result).toBe(true);
    });

    it('should throw ForbiddenException with ACCESS_DENIED when user is not Admin', async () => {
      jest
        .spyOn(JwtAuthGuard.prototype, 'canActivate')
        .mockResolvedValue(true as any);

      const ctx = mockContext({ sub: 2, email: 'u@b.com', role: UserRole.User });
      await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
      try {
        await guard.canActivate(ctx);
      } catch (e) {
        expect(e.getResponse()).toEqual({
          code: AppErrorCode.ACCESS_DENIED,
          message: 'אין לך הרשאת מנהל לביצוע פעולה זו',
        });
      }
    });

    it('should return false when super.canActivate returns false', async () => {
      jest
        .spyOn(JwtAuthGuard.prototype, 'canActivate')
        .mockResolvedValue(false as any);

      const ctx = mockContext({ sub: 1, email: 'a@b.com', role: UserRole.Admin });
      const result = await guard.canActivate(ctx);
      expect(result).toBe(false);
    });
  });
});
