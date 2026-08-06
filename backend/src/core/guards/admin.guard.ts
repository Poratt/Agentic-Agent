import { Injectable, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { AppErrorCode } from '../errors/app-error-code';
import { UserRole } from '../enums/user-role.enum';
import { RequestWithUser } from '../interfaces/request-with-user.interface';

@Injectable()
export class AdminGuard extends JwtAuthGuard {
  // שים לב: הפונקציה הופכת ל-async ומחזירה Promise<boolean>
  override async canActivate(context: ExecutionContext): Promise<boolean> {
    
    // 1. מחכים לאימות ה-JWT (Passport ימלא את request.user)
    const isAuthenticated = await super.canActivate(context);
    if (!isAuthenticated) return false;

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    // 2. בדיקת רול (עכשיו כשה-user בטוח נמצא ב-request)
    if (user?.role !== UserRole.Admin) {
      throw new ForbiddenException({ 
        code: AppErrorCode.ACCESS_DENIED,
        message: 'אין לך הרשאת מנהל לביצוע פעולה זו' 
      });
    }

    return true;
  }
}