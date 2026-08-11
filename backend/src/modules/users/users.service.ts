import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UserRole } from '../../core/enums/user-role.enum';
import { ServiceResultContainer } from '../../core/models/service-result-container.model';
import { UserResponseDto } from './dto/user-response.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private usersRepo: Repository<User>) {}

  async findAllSafe(): Promise<ServiceResultContainer<UserResponseDto[]>> {
    const users = await this.usersRepo.find({
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

    return {
      success: true,
      message: 'Users retrieved successfully',
      result: users.map((user) => this.toUserResponse(user)),
    };
  }

  async findOneSafe(id: number): Promise<ServiceResultContainer<UserResponseDto>> {
    const user = await this.findSafeUser(id);

    return {
      success: true,
      message: 'User retrieved successfully',
      result: this.toUserResponse(user),
    };
  }

  /**
   * Returns the first admin user (ordered by id ascending). Used by the nightly
   * ideas cron, which runs without a request context and needs a concrete owner
   * for the generated sessions. Returns null when no admin exists.
   */
  async findFirstAdmin(): Promise<User | null> {
    return this.usersRepo.findOne({
      where: { role: UserRole.Admin },
      order: { id: 'ASC' },
    });
  }

  async updateRole(id: number, role: UserRole): Promise<ServiceResultContainer<UserResponseDto>> {
    const exists = await this.usersRepo.findOne({ where: { id } });
    if (!exists) throw new NotFoundException('User not found');

    await this.usersRepo.update(id, { role });

    const updated = await this.findSafeUser(id);

    return {
      success: true,
      message: 'User role updated successfully',
      result: this.toUserResponse(updated),
    };
  }

  async update(id: number, updateUserDto: UpdateUserDto): Promise<ServiceResultContainer<UserResponseDto>> {
    const exists = await this.usersRepo.findOne({ where: { id } });
    if (!exists) throw new NotFoundException('User not found');

    await this.usersRepo.update(id, updateUserDto);

    const updated = await this.findSafeUser(id);

    return {
      success: true,
      message: 'User updated successfully',
      result: this.toUserResponse(updated),
    };
  }

  async delete(id: number): Promise<ServiceResultContainer<{ deleted: boolean }>> {
    const exists = await this.usersRepo.findOne({ where: { id } });
    if (!exists) throw new NotFoundException('User not found');

    await this.usersRepo.delete(id);

    return {
      success: true,
      message: 'User deleted successfully',
      result: { deleted: true },
    };
  }

  private async findSafeUser(id: number): Promise<User> {
    const user = await this.usersRepo.findOne({
      where: { id },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  private toUserResponse(user: User): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLoginAt: user.lastLoginAt,
    };
  }
}
