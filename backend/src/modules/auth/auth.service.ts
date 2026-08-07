import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { Request, Response } from 'express';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ServiceResultContainer } from '../../core/models/service-result-container.model';
import { User } from '../users/entities/user.entity';
import { UserResponseDto } from '../users/dto/user-response.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private usersRepo: Repository<User>,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<ServiceResultContainer<UserResponseDto>> {
    const exists = await this.usersRepo.findOne({ where: { email: dto.email } });
    if (exists) throw new ConflictException('Email already in use');

    const hashed = await bcrypt.hash(dto.password, 10);
    const user = this.usersRepo.create({
      email: dto.email,
      fullName: dto.fullName,
      password: hashed,
    });
    await this.usersRepo.save(user);

    return {
      success: true,
      message: 'User registered successfully',
      result: this.toUserResponse(user),
    };
  }

  async login(dto: LoginDto, res: Response): Promise<ServiceResultContainer<UserResponseDto>> {
    const user = await this.usersRepo.findOne({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    await this.setTokens(user, res);

    return {
      success: true,
      message: 'Logged in successfully',
      result: this.toUserResponse({ ...user, lastLoginAt: new Date() }),
    };
  }

  async refresh(userId: number, refreshToken: string, res: Response): Promise<ServiceResultContainer<UserResponseDto>> {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user || !user.refreshToken) throw new UnauthorizedException();

    const valid = await bcrypt.compare(refreshToken, user.refreshToken);
    if (!valid) throw new UnauthorizedException();

    await this.setTokens(user, res);

    return {
      success: true,
      message: 'Token refreshed successfully',
      result: this.toUserResponse({ ...user, lastLoginAt: new Date() }),
    };
  }

  async logout(req: Request, res: Response): Promise<ServiceResultContainer<{ ok: true }>> {
    // Best-effort token cleanup: only the refresh token is revoked (the access
    // token may already be expired, which is why logout must not depend on it).
    // The refresh guard decodes the refresh cookie without re-validating the
    // access token, so we can still clear the stored hash and cookies.
    const refreshToken = req.cookies?.['refresh_token'];
    if (refreshToken) {
      try {
        const payload = this.jwtService.verify(refreshToken, {
          secret: this.config.get('JWT_REFRESH_SECRET'),
        });
        await this.usersRepo.update(payload.sub, { refreshToken: null });
      } catch {
        // Refresh token expired/invalid — nothing to revoke; clear cookies below anyway.
      }
    }
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');

    return {
      success: true,
      message: 'Logged out successfully',
      result: { ok: true },
    };
  }

  async validateUser(userId: number): Promise<User | null> {
    return this.usersRepo.findOne({ where: { id: userId } });
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

  private async setTokens(user: User, res: Response): Promise<void> {
    const payload = { sub: user.id, email: user.email, role: user.role };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.config.get('JWT_REFRESH_SECRET'),
      expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN', '7d'),
    });

    const hashed = await bcrypt.hash(refreshToken, 10);
    await this.usersRepo.update(user.id, {
      refreshToken: hashed,
      lastLoginAt: new Date(),
    });

    res.cookie('access_token', accessToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 15 * 60 * 1000,
    });

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }
}
