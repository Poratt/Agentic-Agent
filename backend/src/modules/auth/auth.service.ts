import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { Response } from 'express';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ServiceResultContainer } from '../../core/models/service-result-container.model';
import { UserRole } from '../../core/enums/user-role.enum';
import { User } from '../users/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private usersRepo: Repository<User>,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const exists = await this.usersRepo.findOne({ where: { email: dto.email } });
    if (exists) throw new ConflictException('Email already in use');
    const hashed = await bcrypt.hash(dto.password, 10);
    const user = this.usersRepo.create({
      email: dto.email,
      fullName: dto.fullName,
      password: hashed
    });
    await this.usersRepo.save(user);

    const result: ServiceResultContainer<{ id: number; email: string }> = {
      success: true,
      message: 'User registered successfully',
      result: { id: user.id, email: user.email },
    };
    return result;
  }

  async login(dto: LoginDto, res: Response) {
    const user = await this.usersRepo.findOne({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');
    await this.setTokens(user, res);

    const result: ServiceResultContainer<{ id: number; email: string; role: UserRole }> = {
      success: true,
      message: 'Logged in successfully',
      result: { id: user.id, email: user.email, role: user.role },
    };
    return result;
  }

  async refresh(userId: number, refreshToken: string, res: Response) {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user || !user.refreshToken) throw new UnauthorizedException();
    const valid = await bcrypt.compare(refreshToken, user.refreshToken);
    if (!valid) throw new UnauthorizedException();
    await this.setTokens(user, res);

    const result: ServiceResultContainer<{ id: number; email: string; role: UserRole }> = {
      success: true,
      message: 'Token refreshed successfully',
      result: { id: user.id, email: user.email, role: user.role },
    };
    return result;
  }

  async logout(userId: number, res: Response) {
    await this.usersRepo.update(userId, { refreshToken: null });
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');

    const result: ServiceResultContainer<{ ok: true }> = {
      success: true,
      message: 'Logged out successfully',
      result: { ok: true },
    };
    return result;
  }

  async validateUser(userId: number) {
    return this.usersRepo.findOne({ where: { id: userId } });
  }

  private async setTokens(user: User, res: Response) {
    const payload = { sub: user.id, email: user.email, role: user.role };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.config.get('JWT_REFRESH_SECRET'),
      expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN', '7d'),
    });

    const hashed = await bcrypt.hash(refreshToken, 10);
    await this.usersRepo.update(user.id, {
      refreshToken: hashed,
      lastLoginAt: new Date()
    });

    res.cookie('access_token', accessToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      maxAge: 15 * 60 * 1000,
    });

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }
}
