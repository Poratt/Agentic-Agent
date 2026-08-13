import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { UserRole } from '../../core/enums/user-role.enum';
import { UpdateUserDto } from './dto/update-user.dto';

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 1,
    email: 'test@test.com',
    fullName: 'Test User',
    password: 'hashed-pw',
    refreshToken: 'refresh-token',
    role: UserRole.User,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-02'),
    lastLoginAt: new Date('2026-01-03'),
    ...overrides,
  };
}

describe('UsersService', () => {
  let service: UsersService;
  let repo: jest.Mocked<Repository<User>>;

  beforeEach(async () => {
    repo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: repo },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
  });

  describe('findAllSafe', () => {
    it('returns mapped DTOs in DESC id order, excludes password/refreshToken', async () => {
      const users = [
        makeUser({ id: 3, email: 'a@test.com' }),
        makeUser({ id: 1, email: 'b@test.com' }),
      ];
      repo.find.mockResolvedValue(users);

      const result = await service.findAllSafe();

      expect(repo.find).toHaveBeenCalledWith({
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          createdAt: true,
          updatedAt: true,
          lastLoginAt: true,
        },
        order: { id: 'DESC' },
      });
      expect(result.success).toBe(true);
      expect(result.result).toHaveLength(2);
      expect(result.result[0].id).toBe(3);
      expect(result.result[1].id).toBe(1);
      // password and refreshToken must not appear in DTOs
      expect(JSON.stringify(result.result)).not.toContain('hashed-pw');
      expect(JSON.stringify(result.result)).not.toContain('refresh-token');
    });
  });

  describe('findOneSafe', () => {
    it('returns DTO for valid id', async () => {
      const user = makeUser({ id: 5 });
      repo.findOne.mockResolvedValue(user);

      const result = await service.findOneSafe(5);

      expect(result.success).toBe(true);
      expect(result.result.id).toBe(5);
      expect(result.result.email).toBe('test@test.com');
      expect(JSON.stringify(result.result)).not.toContain('hashed-pw');
    });

    it('throws NotFoundException for missing id', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.findOneSafe(999)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('findFirstAdmin', () => {
    it('returns first admin User', async () => {
      const admin = makeUser({ id: 1, role: UserRole.Admin });
      repo.findOne.mockResolvedValue(admin);

      const result = await service.findFirstAdmin();

      expect(repo.findOne).toHaveBeenCalledWith({
        where: { role: UserRole.Admin },
        order: { id: 'ASC' },
      });
      expect(result).toEqual(admin);
    });

    it('returns null when none exist', async () => {
      repo.findOne.mockResolvedValue(null);

      const result = await service.findFirstAdmin();

      expect(result).toBeNull();
    });
  });

  describe('updateRole', () => {
    it('updates role for existing user', async () => {
      const existing = makeUser({ id: 2, role: UserRole.User });
      const updated = makeUser({ id: 2, role: UserRole.Admin });
      repo.findOne
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce(updated);

      const result = await service.updateRole(2, UserRole.Admin);

      expect(repo.update).toHaveBeenCalledWith(2, { role: UserRole.Admin });
      expect(result.success).toBe(true);
      expect(result.result.role).toBe(UserRole.Admin);
    });

    it('throws NotFoundException for missing user', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(
        service.updateRole(999, UserRole.Admin),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('update', () => {
    it('updates fields for existing user', async () => {
      const existing = makeUser({ id: 3 });
      const updated = makeUser({ id: 3, fullName: 'Updated Name' });
      repo.findOne
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce(updated);

      const dto: UpdateUserDto = { fullName: 'Updated Name' };
      const result = await service.update(3, dto);

      expect(repo.update).toHaveBeenCalledWith(3, dto);
      expect(result.success).toBe(true);
      expect(result.result.fullName).toBe('Updated Name');
    });

    it('throws NotFoundException for missing user', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(
        service.update(999, { fullName: 'X' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('delete', () => {
    it('deletes and returns { deleted: true }', async () => {
      const existing = makeUser({ id: 4 });
      repo.findOne.mockResolvedValue(existing);
      repo.delete.mockResolvedValue({ raw: [], affected: 1 } as any);

      const result = await service.delete(4);

      expect(repo.delete).toHaveBeenCalledWith(4);
      expect(result.success).toBe(true);
      expect(result.result).toEqual({ deleted: true });
    });

    it('throws NotFoundException for missing user', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.delete(999)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
