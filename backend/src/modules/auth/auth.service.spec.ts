import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../../core/enums/user-role.enum';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let usersRepo: jest.Mocked<Repository<User>>;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;

  const now = new Date();

  function makeUser(overrides: Partial<User> = {}): User {
    return {
      id: 1,
      email: 'test@test.com',
      fullName: 'Test User',
      password: 'hashed',
      refreshToken: null,
      role: UserRole.User,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: null,
      ...overrides,
    };
  }

  beforeEach(async () => {
    jest.clearAllMocks();

    usersRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    } as any;

    jwtService = {
      sign: jest.fn(),
      verify: jest.fn(),
    } as any;

    configService = {
      get: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: usersRepo },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  describe('register', () => {
    it('creates a new user and returns UserResponseDto', async () => {
      const dto = { email: 'new@test.com', fullName: 'New User', password: 'password123' };
      usersRepo.findOne.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed123');
      const createdUser = makeUser({ email: 'new@test.com', fullName: 'New User', password: 'hashed123' });
      usersRepo.create.mockReturnValue(createdUser as any);
      usersRepo.save.mockResolvedValue(createdUser);

      const result = await service.register(dto);

      expect(result.success).toBe(true);
      expect(result.result.email).toBe('new@test.com');
      expect(result.result.fullName).toBe('New User');
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(usersRepo.create).toHaveBeenCalledWith({
        email: 'new@test.com',
        fullName: 'New User',
        password: 'hashed123',
      });
      expect(usersRepo.save).toHaveBeenCalled();
    });

    it('throws ConflictException when email already exists', async () => {
      const dto = { email: 'existing@test.com', fullName: 'User', password: 'password123' };
      usersRepo.findOne.mockResolvedValue(makeUser({ email: 'existing@test.com' }));

      await expect(service.register(dto)).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('login', () => {
    it('returns user with lastLoginAt and sets cookies', async () => {
      const dto = { email: 'test@test.com', password: 'password123' };
      const user = makeUser();
      usersRepo.findOne.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jwtService.sign.mockReturnValue('token');
      configService.get.mockImplementation((key: string, fallback?: string) => {
        if (key === 'JWT_REFRESH_SECRET') return 'refresh-secret';
        if (key === 'JWT_REFRESH_EXPIRES_IN') return fallback;
        return fallback;
      });
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-refresh');
      usersRepo.update.mockResolvedValue(undefined as any);

      const res = { cookie: jest.fn(), clearCookie: jest.fn() } as any;
      const result = await service.login(dto, res);

      expect(result.success).toBe(true);
      expect(result.result.email).toBe('test@test.com');
      expect(result.result.lastLoginAt).toBeInstanceOf(Date);
      expect(res.cookie).toHaveBeenCalledTimes(2);
      expect(res.cookie).toHaveBeenCalledWith('access_token', 'token', expect.any(Object));
      expect(res.cookie).toHaveBeenCalledWith('refresh_token', 'token', expect.any(Object));
    });

    it('throws UnauthorizedException when user not found', async () => {
      const dto = { email: 'noone@test.com', password: 'password123' };
      usersRepo.findOne.mockResolvedValue(null);

      const res = { cookie: jest.fn(), clearCookie: jest.fn() } as any;
      await expect(service.login(dto, res)).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('throws UnauthorizedException when password is wrong', async () => {
      const dto = { email: 'test@test.com', password: 'wrong' };
      usersRepo.findOne.mockResolvedValue(makeUser());
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const res = { cookie: jest.fn(), clearCookie: jest.fn() } as any;
      await expect(service.login(dto, res)).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('refresh', () => {
    it('issues new tokens when refresh token is valid', async () => {
      const user = makeUser({ refreshToken: 'stored-hash' });
      usersRepo.findOne.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jwtService.sign.mockReturnValue('new-token');
      configService.get.mockImplementation((key: string, fallback?: string) => {
        if (key === 'JWT_REFRESH_SECRET') return 'refresh-secret';
        if (key === 'JWT_REFRESH_EXPIRES_IN') return fallback;
        return fallback;
      });
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hash');
      usersRepo.update.mockResolvedValue(undefined as any);

      const res = { cookie: jest.fn(), clearCookie: jest.fn() } as any;
      const result = await service.refresh(1, 'valid-refresh', res);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Token refreshed successfully');
      expect(res.cookie).toHaveBeenCalledTimes(2);
    });

    it('throws UnauthorizedException when user not found', async () => {
      usersRepo.findOne.mockResolvedValue(null);

      const res = { cookie: jest.fn(), clearCookie: jest.fn() } as any;
      await expect(service.refresh(999, 'token', res)).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('throws UnauthorizedException when no stored refresh token', async () => {
      usersRepo.findOne.mockResolvedValue(makeUser({ refreshToken: null }));

      const res = { cookie: jest.fn(), clearCookie: jest.fn() } as any;
      await expect(service.refresh(1, 'token', res)).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('throws UnauthorizedException when refresh token hash mismatch', async () => {
      usersRepo.findOne.mockResolvedValue(makeUser({ refreshToken: 'stored-hash' }));
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const res = { cookie: jest.fn(), clearCookie: jest.fn() } as any;
      await expect(service.refresh(1, 'wrong-token', res)).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('clears stored refresh hash and cookies when valid refresh cookie exists', async () => {
      jwtService.verify.mockReturnValue({ sub: 1 });
      usersRepo.update.mockResolvedValue(undefined as any);

      const req = { cookies: { refresh_token: 'valid-token' } } as any;
      const res = { cookie: jest.fn(), clearCookie: jest.fn() } as any;
      configService.get.mockReturnValue('refresh-secret');

      const result = await service.logout(req, res);

      expect(result.success).toBe(true);
      expect(result.result).toEqual({ ok: true });
      expect(usersRepo.update).toHaveBeenCalledWith(1, { refreshToken: null });
      expect(res.clearCookie).toHaveBeenCalledWith('access_token');
      expect(res.clearCookie).toHaveBeenCalledWith('refresh_token');
    });

    it('still clears cookies when no refresh cookie present', async () => {
      const req = { cookies: {} } as any;
      const res = { cookie: jest.fn(), clearCookie: jest.fn() } as any;

      const result = await service.logout(req, res);

      expect(result.success).toBe(true);
      expect(usersRepo.update).not.toHaveBeenCalled();
      expect(res.clearCookie).toHaveBeenCalledWith('access_token');
      expect(res.clearCookie).toHaveBeenCalledWith('refresh_token');
    });
  });

  describe('validateUser', () => {
    it('returns user when found', async () => {
      const user = makeUser();
      usersRepo.findOne.mockResolvedValue(user);

      const result = await service.validateUser(1);

      expect(result).toEqual(user);
    });

    it('returns null when user not found', async () => {
      usersRepo.findOne.mockResolvedValue(null);

      const result = await service.validateUser(999);

      expect(result).toBeNull();
    });
  });
});
