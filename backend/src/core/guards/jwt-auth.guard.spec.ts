import { UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { AppErrorCode } from '../errors/app-error-code';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { UserRole } from '../enums/user-role.enum';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;

  beforeEach(() => {
    jest.clearAllMocks();
    guard = new JwtAuthGuard();
  });

  describe('handleRequest', () => {
    const mockUser: JwtPayload = {
      sub: 1,
      email: 'test@example.com',
      role: UserRole.User,
    };

    it('should return user when user is present and no error', () => {
      const result = guard.handleRequest(null, mockUser);
      expect(result).toBe(mockUser);
    });

    it('should throw UnauthorizedException with AUTH_INVALID_TOKEN when user exists but error is present', () => {
      const error = new Error('token expired');
      expect(() => guard.handleRequest(error, mockUser)).toThrow(UnauthorizedException);
      try {
        guard.handleRequest(error, mockUser);
      } catch (e) {
        expect(e.getResponse()).toEqual({
          code: AppErrorCode.AUTH_INVALID_TOKEN,
          message: 'פג תוקף ההתחברות. התחברו מחדש.',
        });
      }
    });

    it('should throw UnauthorizedException with AUTH_INVALID_TOKEN when no user and error is present', () => {
      const error = new Error('invalid token');
      expect(() => guard.handleRequest(error, null)).toThrow(UnauthorizedException);
      try {
        guard.handleRequest(error, null);
      } catch (e) {
        expect(e.getResponse()).toEqual({
          code: AppErrorCode.AUTH_INVALID_TOKEN,
          message: 'פג תוקף ההתחברות. התחברו מחדש.',
        });
      }
    });

    it('should throw UnauthorizedException with AUTH_MISSING_TOKEN when no user and no error', () => {
      expect(() => guard.handleRequest(null, null)).toThrow(UnauthorizedException);
      try {
        guard.handleRequest(null, null);
      } catch (e) {
        expect(e.getResponse()).toEqual({
          code: AppErrorCode.AUTH_MISSING_TOKEN,
          message: 'נדרשת התחברות כדי להמשיך.',
        });
      }
    });
  });
});
