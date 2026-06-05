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
import { AxiosRequestConfig } from 'axios';

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
  ) { }


  getSemanticActionDescription(functionName: string, args: any): string {
    const id = args && args.id ? args.id : '';

    // שליפת המטא-דאטה ששמרנו ב-Map
    const endpointMeta = this.swaggerToolsParser.getEndpoint(functionName);

    // אם מצאנו summary (שהוא ה-summaryHe בעדיפות ראשונה מהסוואגר), נחזיר אותו
    if (endpointMeta && endpointMeta.summary) {
      return endpointMeta.summary;
    }

    // פולבק זמני בעברית, למקרה ששכחת להגדיר באחד הקונטרולרים
    return `מפעיל את כלי המערכת: ${functionName}`;
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

    // תיקון באג 1: הגנה מפני קריסת קריאת JSON פגום מה-LLM
    let args: Record<string, any> = {};
    try {
      args = JSON.parse(call.function.arguments || '{}');
    } catch (e) {
      this.logger.warn(`Failed to parse tool arguments for ${call.function.name}, using empty object.`);
    }

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

    this.logger.log(`Executing tool "${call.function.name}" -> [${endpointMeta.method.toUpperCase()}] ${resolved.targetUrl}`);
    const systemHeaders = await this.getSystemHeadersForUser(userId);

    try {
      const method = endpointMeta.method.toLowerCase();

      // תיקון באג 2 + כתיבה גנרית: שימוש בקונפיגורציית Axios אחידה שתומכת ב-Body לכל סוגי הבקשות (כולל DELETE/PUT)
      const config: AxiosRequestConfig = {
        method: method as any,
        url: resolved.targetUrl,
        headers: systemHeaders,
        params: resolved.queryParams,
        // קריאות גט לא שולחות Body
        ...(method !== 'get' ? { data: resolved.body } : {}),
      };

      const response$ = this.httpService.request(config);
      const res = await firstValueFrom(response$);

      return JSON.stringify((res as any).data);
    } catch (err: any) {
      this.logger.error(`Tool execution error in ${call.function.name}: ${err.message}`);
      return JSON.stringify({
        error: err.message,
        status: err.response?.status || 500,
        details: err.response?.data
      });
    }
  }
}