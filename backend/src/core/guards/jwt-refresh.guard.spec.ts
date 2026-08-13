import { UnauthorizedException } from '@nestjs/common';
import { JwtRefreshGuard } from './jwt-refresh.guard';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { UserRole } from '../enums/user-role.enum';

describe('JwtRefreshGuard', () => {
  let guard: JwtRefreshGuard;

  beforeEach(() => {
    jest.clearAllMocks();
    guard = new JwtRefreshGuard();
  });

  describe('handleRequest', () => {
    const mockUser: JwtPayload = {
      sub: 1,
      email: 'test@example.com',
      role: UserRole.User,
      refreshToken: 'some-token',
    };

    it('should return user when user is present and no error', () => {
      const result = guard.handleRequest(null, mockUser);
      expect(result).toBe(mockUser);
    });

    it('should throw the original error when error is present', () => {
      const error = new Error('refresh token expired');
      expect(() => guard.handleRequest(error, null)).toThrow(error);
    });

    it('should throw UnauthorizedException when no user and no error', () => {
      expect(() => guard.handleRequest(null, null)).toThrow(UnauthorizedException);
    });
  });
});
