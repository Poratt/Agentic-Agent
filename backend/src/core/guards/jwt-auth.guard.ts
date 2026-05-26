import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AppErrorCode } from '../errors/app-error-code';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  override canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  override handleRequest<TUser = JwtPayload>(err: unknown, user: unknown): TUser {
    if (!user) {
      if (err) {
        throw new UnauthorizedException({
          code: AppErrorCode.AUTH_INVALID_TOKEN,
          message: 'פג תוקף ההתחברות. התחברו מחדש.',
        });
      }

      throw new UnauthorizedException({
        code: AppErrorCode.AUTH_MISSING_TOKEN,
        message: 'נדרשת התחברות כדי להמשיך.',
      });
    }

    if (err) {
      throw new UnauthorizedException({
        code: AppErrorCode.AUTH_INVALID_TOKEN,
        message: 'פג תוקף ההתחברות. התחברו מחדש.',
      });
    }

    return user as TUser;
  }
}
