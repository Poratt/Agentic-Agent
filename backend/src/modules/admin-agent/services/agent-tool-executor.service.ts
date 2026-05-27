import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { User } from '../../users/entities/user.entity';
import { LlmToolCall } from '../llm.service';
import { SwaggerToolsParser } from './swagger-tools.parser';

@Injectable()
export class AgentToolExecutorService {
  private readonly logger = new Logger(AgentToolExecutorService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly httpService: HttpService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly swaggerToolsParser: SwaggerToolsParser,
  ) {}

  getSemanticActionDescription(functionName: string, args: any): string {
    const id = args && args.id ? args.id : '';

    switch (functionName) {
      case 'UsersController_list': {
        return 'סורק את רשימת המשתמשים הרשומים במערכת';
      }
      case 'UsersController_getById': {
        return `שולף את פרופיל המשתמש המלא (מזהה: ${id})`;
      }
      case 'UsersController_update': {
        return `מעדכן את פרטי המשתמש (מזהה: ${id})`;
      }
      case 'UsersController_delete': {
        return `מוחק לצמיתות את משתמש ${id} מהמערכת`;
      }
      case 'UsersController_updateRole': {
        return `משנה את הרשאות התפקיד של משתמש ${id}`;
      }
      case 'AuthController_me': {
        return 'שולף את פרטי החיבור של המשתמש הנוכחי';
      }
      default: {
        return `מפעיל את כלי המערכת: ${functionName}`;
      }
    }
  }

  private checkActionAllowed(
    functionName: string,
    args: any,
    currentUserId: number,
  ): { allowed: boolean; reason?: string } {
    const targetId = args && args.id ? Number(args.id) : null;

    if (targetId === currentUserId) {
      if (functionName === 'UsersController_delete') {
        return {
          allowed: false,
          reason: 'חוק אבטחת מערכת: אינך מורשה למחוק את החשבון המחובר של עצמך מהמערכת.',
        };
      }

      if (functionName === 'UsersController_updateRole') {
        const targetRole = Number(args.role);
        if (targetRole === 2) {
          return {
            allowed: false,
            reason: 'חוק אבטחת מערכת: אינך מורשה להוריד את עצמך בדרגה מתפקיד מנהל לתפקיד משתמש רגיל.',
          };
        }
      }
    }

    return { allowed: true };
  }

  private async getSystemHeadersForUser(userId: number): Promise<Record<string, string>> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error(`User ${userId} not found for system authentication`);
    }

    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_SECRET'),
      expiresIn: '5m',
    });

    return {
      'Cookie': `access_token=${accessToken}`,
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  async executeToolCall(call: LlmToolCall, userId: number): Promise<string> {
    const endpointMeta = this.swaggerToolsParser.getEndpoint(call.function.name);
    if (!endpointMeta) {
      this.logger.error(`Unknown tool call: ${call.function.name}`);
      return JSON.stringify({ error: `Unknown tool call: ${call.function.name}` });
    }

    const args = JSON.parse(call.function.arguments || '{}');

    // המרת תפקיד מטקסט למספר (Coercion)
    if (args && typeof args.role === 'string') {
      const lowerRole = args.role.toLowerCase();
      if (lowerRole === 'admin') {
        args.role = 1;
      } else if (lowerRole === 'user') {
        args.role = 2;
      }
    }

    // בדיקת חוקי אבטחה
    const guardResult = this.checkActionAllowed(call.function.name, args, userId);
    if (!guardResult.allowed) {
      this.logger.warn(`Security Blocked Action: ${guardResult.reason}`);
      return JSON.stringify({ error: guardResult.reason, status: 403 });
    }

    const baseUrl = `http://localhost:${this.configService.get('PORT', 3000)}`;
    const resolved = this.swaggerToolsParser.resolveArguments(
      endpointMeta.path,
      endpointMeta.method,
      args,
      baseUrl,
    );

    this.logger.log(`Executing tool "${call.function.name}" -> ${resolved.targetUrl}`);
    const systemHeaders = await this.getSystemHeadersForUser(userId);

    try {
      let response$;
      const method = endpointMeta.method.toLowerCase();

      if (method === 'get') {
        response$ = this.httpService.get(resolved.targetUrl, {
          params: resolved.queryParams,
          headers: systemHeaders,
        });
      } else if (method === 'post') {
        response$ = this.httpService.post(resolved.targetUrl, resolved.body, {
          headers: systemHeaders,
        });
      } else if (method === 'patch') {
        response$ = this.httpService.patch(resolved.targetUrl, resolved.body, {
          headers: systemHeaders,
        });
      } else if (method === 'delete') {
        response$ = this.httpService.delete(resolved.targetUrl, {
          headers: systemHeaders,
        });
      } else {
        response$ = this.httpService.get(resolved.targetUrl, {
          params: resolved.queryParams,
          headers: systemHeaders,
        });
      }

      const res = await firstValueFrom(response$);
      return JSON.stringify((res as any).data);
    } catch (err: any) {
      this.logger.error(`Tool execution error: ${err.message}`);
      return JSON.stringify({ error: err.message, status: err.response?.status });
    }
  }
}