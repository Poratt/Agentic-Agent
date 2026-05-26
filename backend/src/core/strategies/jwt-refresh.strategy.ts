import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy, StrategyOptionsWithRequest } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        JwtRefreshStrategy.extractToken,
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_REFRESH_SECRET') ?? '',
      passReqToCallback: true,
    } satisfies StrategyOptionsWithRequest);
  }

  private static extractToken(request: Request): string | null {
    const token: unknown = request?.cookies?.['refresh_token'];
    return typeof token === 'string' && token.length > 0 ? token : null;
  }

  validate(request: Request, payload: JwtPayload) {
    const refreshToken = JwtRefreshStrategy.extractToken(request);
    return {
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
      refreshToken,
    };
  }
}
