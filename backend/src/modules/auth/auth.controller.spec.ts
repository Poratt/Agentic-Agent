import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  beforeEach(async () => {
    jest.clearAllMocks();

    authService = {
      register: jest.fn(),
      login: jest.fn(),
      refresh: jest.fn(),
      logout: jest.fn(),
      validateUser: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
      ],
    }).compile();

    controller = module.get(AuthController);
  });

  describe('POST /auth/register', () => {
    it('calls authService.register and returns result', async () => {
      const dto = { email: 'new@test.com', fullName: 'New', password: 'password123' };
      const expectedResult = {
        success: true,
        message: 'User registered successfully',
        result: { id: 1, email: 'new@test.com', fullName: 'New', role: 2, createdAt: new Date(), updatedAt: new Date(), lastLoginAt: null },
      };
      authService.register.mockResolvedValue(expectedResult as any);

      const req = { headers: {} } as any;
      const result = await controller.register(req, dto);

      expect(authService.register).toHaveBeenCalledWith(dto);
      expect(result).toBe(expectedResult);
    });

    it('throws ForbiddenException for disallowed origin', async () => {
      const dto = { email: 'new@test.com', fullName: 'New', password: 'password123' };
      const req = { headers: { origin: 'https://evil.com' } } as any;

      expect(() => controller.register(req, dto)).toThrow(ForbiddenException);
      expect(authService.register).not.toHaveBeenCalled();
    });

    it('allows request with no origin header', async () => {
      const dto = { email: 'new@test.com', fullName: 'New', password: 'password123' };
      const expectedResult = {
        success: true,
        message: 'User registered successfully',
        result: { id: 1, email: 'new@test.com', fullName: 'New', role: 2, createdAt: new Date(), updatedAt: new Date(), lastLoginAt: null },
      };
      authService.register.mockResolvedValue(expectedResult as any);

      const req = { headers: {} } as any;
      const result = await controller.register(req, dto);

      expect(result).toBe(expectedResult);
    });
  });

  describe('POST /auth/login', () => {
    it('calls authService.login with dto and res', async () => {
      const dto = { email: 'test@test.com', password: 'password123' };
      const expectedResult = {
        success: true,
        message: 'Logged in successfully',
        result: { id: 1, email: 'test@test.com', fullName: 'Test', role: 2, createdAt: new Date(), updatedAt: new Date(), lastLoginAt: new Date() },
      };
      authService.login.mockResolvedValue(expectedResult as any);

      const req = { headers: {} } as any;
      const res = { cookie: jest.fn(), clearCookie: jest.fn() } as any;
      const result = await controller.login(req, dto, res);

      expect(authService.login).toHaveBeenCalledWith(dto, res);
      expect(result).toBe(expectedResult);
    });

    it('propagates UnauthorizedException from authService', async () => {
      const dto = { email: 'test@test.com', password: 'wrong' };
      authService.login.mockRejectedValue(new UnauthorizedException('Invalid credentials'));

      const req = { headers: {} } as any;
      const res = { cookie: jest.fn(), clearCookie: jest.fn() } as any;

      await expect(controller.login(req, dto, res)).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('throws ForbiddenException for disallowed origin', async () => {
      const dto = { email: 'test@test.com', password: 'password123' };
      const req = { headers: { origin: 'https://evil.com' } } as any;
      const res = { cookie: jest.fn(), clearCookie: jest.fn() } as any;

      expect(() => controller.login(req, dto, res)).toThrow(ForbiddenException);
      expect(authService.login).not.toHaveBeenCalled();
    });
  });

  describe('POST /auth/refresh', () => {
    it('calls authService.refresh with user from req', async () => {
      const expectedResult = {
        success: true,
        message: 'Token refreshed successfully',
        result: { id: 1, email: 'test@test.com', fullName: 'Test', role: 2, createdAt: new Date(), updatedAt: new Date(), lastLoginAt: new Date() },
      };
      authService.refresh.mockResolvedValue(expectedResult as any);

      const req = { user: { sub: 1, refreshToken: 'valid-token' } } as any;
      const res = { cookie: jest.fn(), clearCookie: jest.fn() } as any;
      const result = await controller.refresh(req, res);

      expect(authService.refresh).toHaveBeenCalledWith(1, 'valid-token', res);
      expect(result).toBe(expectedResult);
    });

    it('throws UnauthorizedException when req.user is missing', async () => {
      const req = { user: undefined } as any;
      const res = { cookie: jest.fn(), clearCookie: jest.fn() } as any;

      expect(() => controller.refresh(req, res)).toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when req.user.refreshToken is missing', async () => {
      const req = { user: { sub: 1 } } as any;
      const res = { cookie: jest.fn(), clearCookie: jest.fn() } as any;

      expect(() => controller.refresh(req, res)).toThrow(UnauthorizedException);
    });
  });

  describe('POST /auth/logout', () => {
    it('calls authService.logout with req and res', async () => {
      const expectedResult = {
        success: true,
        message: 'Logged out successfully',
        result: { ok: true },
      };
      authService.logout.mockResolvedValue(expectedResult as any);

      const req = { cookies: { refresh_token: 'token' } } as any;
      const res = { cookie: jest.fn(), clearCookie: jest.fn() } as any;
      const result = await controller.logout(req, res);

      expect(authService.logout).toHaveBeenCalledWith(req, res);
      expect(result).toBe(expectedResult);
    });
  });

  describe('GET /auth/me', () => {
    it('returns req.user as ServiceResultContainer', () => {
      const user = { sub: 1, email: 'test@test.com', role: 2 };
      const req = { user } as any;

      const result = controller.me(req);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Current user retrieved successfully');
      expect(result.result).toBe(user);
    });

    it('throws UnauthorizedException when req.user is missing', () => {
      const req = { user: undefined } as any;

      expect(() => controller.me(req)).toThrow(UnauthorizedException);
    });
  });
});
