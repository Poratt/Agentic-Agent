import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UserRole } from '../../core/enums/user-role.enum';
import { ServiceResultContainer } from '../../core/models/service-result-container.model';

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private usersRepo: Repository<User>) {}

  async findAllSafe(): Promise<ServiceResultContainer<User[]>> {
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

    const result: ServiceResultContainer<User[]> = {
      success: true,
      message: 'Users retrieved successfully',
      result: users,
    };
    return result;
  }

  async findOneSafe(id: number): Promise<ServiceResultContainer<User>> {
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
    const result: ServiceResultContainer<User> = {
      success: true,
      message: 'User retrieved successfully',
      result: user,
    };
    return result;
  }

  async updateRole(id: number, role: UserRole): Promise<ServiceResultContainer<User>> {
    const exists = await this.usersRepo.findOne({ where: { id } });
    if (!exists) throw new NotFoundException('User not found');

    await this.usersRepo.update(id, { role });

    const updated = await this.usersRepo.findOne({
      where: { id },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!updated) throw new NotFoundException('User not found after update');

    return {
      success: true,
      message: 'User role updated successfully',
      result: updated,
    };
  }

  async update(id: number, updateUserDto: any): Promise<ServiceResultContainer<User>> {
    const exists = await this.usersRepo.findOne({ where: { id } });
    if (!exists) throw new NotFoundException('User not found');

    await this.usersRepo.update(id, updateUserDto);

    const updated = await this.usersRepo.findOne({
      where: { id },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!updated) throw new NotFoundException('User not found after update');

    return {
      success: true,
      message: 'User updated successfully',
      result: updated,
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
}
