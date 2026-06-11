import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Logger,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiExtraModels,
  ApiForbiddenResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Response } from 'express';
import { AdminAgentService } from './admin-agent.service';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { RequestWithUser } from '../../core/interfaces/request-with-user.interface';
import { AgentRequestDto } from './dto/agent-request.dto';
import { SessionResponseDto } from './dto/session-response.dto';
import { ChatMessageResponseDto } from './dto/chat-message-response.dto';
import { AgentStreamEventDto } from './dto/agent-stream-event.dto';
import { GetSessionsQueryDto } from './dto/get-sessions-query.dto';
import { CustomApiOperationOptions } from '../../core/types/custom-api-operation-options.type';
import { GenUiSpec } from './constants/gen-ui-spec.constant';

@ApiTags('Admin Agent')
@ApiBearerAuth()
@ApiExtraModels(SessionResponseDto, ChatMessageResponseDto, AgentStreamEventDto)
@Controller('admin-agent')
export class AdminAgentController {
  private readonly logger = new Logger(AdminAgentController.name);

  constructor(private readonly adminAgentService: AdminAgentService) { }

  @UseGuards(JwtAuthGuard)
  @Get('sessions')
  @ApiOperation({
    summary: 'Get chat sessions for the authenticated user',
    summaryHe: 'שולף את סשני הצ\'אט של המשתמש המחובר',
    toolIcon: 'ph-chat-centered-text',
    genUiSpec: GenUiSpec.CHAT_SESSIONS_LIST,
    description:
      'Returns recent chat sessions owned by the authenticated user. Sessions from other users are never returned.',
  } as CustomApiOperationOptions)
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Optional maximum number of recent sessions to return.',
  })
  @ApiResponse({ status: 200, description: 'Sessions retrieved successfully.', type: [SessionResponseDto] })
  async getSessions(
    @Req() req: RequestWithUser,
    @Query() query: GetSessionsQueryDto,
  ) {
    if (!req.user) {
      throw new UnauthorizedException();
    }
    return this.adminAgentService.getSessions(req.user.sub, query.limit);
  }

  @UseGuards(JwtAuthGuard)
  @Get('sessions/:id/messages')
  @ApiOperation({
    summary: 'Get session message history',
    summaryHe: 'שולף את היסטוריית ההודעות של סשן הצ\'אט (מזהה: ${id})',
    toolIcon: 'ph-chats',
    genUiSpec: GenUiSpec.CHAT_TRANSCRIPT_TIMELINE,
    description:
      'Returns user and assistant messages for a session owned by the authenticated user. ' +
      'Internal tool messages are filtered out for normal history display.',
  } as CustomApiOperationOptions)
  @ApiParam({ name: 'id', type: Number, description: 'Numeric chat session id.' })
  @ApiResponse({ status: 200, description: 'Historical messages loaded successfully.', type: [ChatMessageResponseDto] })
  async getSessionMessages(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: RequestWithUser,
  ) {
    if (!req.user) {
      throw new UnauthorizedException();
    }
    return this.adminAgentService.getSessionMessages(id, req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post('sessions')
  @ApiOperation({
    summary: 'Create a new chat session',
    summaryHe: 'מייצר סשן שיחת צ\'אט חדש',
    toolIcon: 'ph-plus-circle',
    genUiSpec: GenUiSpec.CHAT_SESSION_CREATED,
    description: 'Creates a new empty chat session owned by the authenticated user.',
  } as CustomApiOperationOptions)
  @ApiResponse({ status: 201, description: 'Chat session created successfully.', type: SessionResponseDto })
  async createSession(@Req() req: RequestWithUser) {
    if (!req.user) {
      throw new UnauthorizedException();
    }
    return this.adminAgentService.createSession(req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('sessions/:id')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Delete chat session',
    summaryHe: 'מוחק לצמיתות את סשן הצ\'אט (מזהה: ${id})',
    toolIcon: 'ph-trash',
    genUiSpec:
      'After this tool succeeds, do not invent response data. Tell the user that the chat session was permanently deleted and mention the requested session id.',
    description:
      'Permanently deletes a session owned by the authenticated user. ' +
      'ChatMessage rows are cascade-deleted through the ChatMessage.session relation.',
  } as CustomApiOperationOptions)
  @ApiParam({ name: 'id', type: Number, description: 'Numeric chat session id to delete.' })
  @ApiResponse({ status: 204, description: 'Chat session deleted successfully.' })
  async deleteSession(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: RequestWithUser,
  ) {
    if (!req.user) {
      throw new UnauthorizedException();
    }
    await this.adminAgentService.deleteSession(id, req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('sessions/:sessionId/messages/:messageId')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Delete a chat message and later history',
    summaryHe: 'מוחק הודעת צאט ואת כל ההודעות שאחריה',
    toolIcon: 'ph-trash',
    genUiSpec:
      'After this tool succeeds, do not invent response data. Tell the user that the selected chat message and later session history were permanently deleted.',
    description:
      'Permanently deletes one message owned by the authenticated user and every later message in the same session. ' +
      'This preserves conversation consistency by preventing later assistant or tool messages from remaining without their original context.',
  } as CustomApiOperationOptions)
  @ApiParam({ name: 'sessionId', type: Number, description: 'Numeric chat session id that owns the message.' })
  @ApiParam({ name: 'messageId', type: Number, description: 'Numeric chat message id to delete from.' })
  @ApiResponse({ status: 204, description: 'Chat message and later session history deleted successfully.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'The session or message does not belong to the authenticated user.' })
  async deleteSessionMessage(
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @Param('messageId', ParseIntPipe) messageId: number,
    @Req() req: RequestWithUser,
  ) {
    if (!req.user) {
      throw new UnauthorizedException();
    }
    await this.adminAgentService.deleteSessionMessage(sessionId, messageId, req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post('query-stream')
  @ApiConsumes('application/json', 'multipart/form-data')
  @ApiOperation({
    summary: 'Query Admin Agent as a streamed response',
    summaryHe: 'שולח שאילתה לסוכן הניהול ומחזיר תגובת סטרים',
    toolIcon: 'ph-robot',
    description:
      'Streams newline-delimited JSON objects over a text/event-stream response. ' +
      'Each line is an AgentStreamEventDto. Token events use { "type": "token", "content": "..." }. ' +
      'Step events use { "type": "step", "icon": "...", "message": "..." }. ' +
      'The stream is complete when the HTTP response ends.',
  } as CustomApiOperationOptions)
  @ApiBody({
    type: AgentRequestDto,
    description: 'Agent prompt payload with optional chat session and per-request LLM model override.',
  })
  @ApiResponse({
    status: 200,
    description: 'Stream opened. Response body contains newline-delimited AgentStreamEventDto JSON objects.',
    type: AgentStreamEventDto,
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  async streamChat(
    @Body() dto: AgentRequestDto,
    @Req() req: RequestWithUser,
    @Res() res: Response,
  ): Promise<void> {
    this.logger.log('--- Incoming Stream Request ---');

    if (!req.user) {
      throw new UnauthorizedException('User not authenticated');
    }

    const userId = req.user.sub;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    try {
      const stream = this.adminAgentService.queryDatabaseStream(
        dto.prompt,
        userId,
        dto.sessionId,
        dto.provider,
        dto.model,
      );

      for await (const token of stream) {
        res.write(token);
      }
    } catch (error: any) {
      this.logger.error(`Error during stream controller: ${error.message}`, error.stack);

      if (!res.closed) {
        res.write('\n\n[שגיאת מערכת: תקשורת הסטרים נותקה במפתיע. נא לנסות שוב.]\n\n');
      }
    } finally {
      if (!res.closed) {
        res.end();
      }
    }
  }
}
