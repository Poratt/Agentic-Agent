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
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { Response } from 'express';
import { AdminAgentService } from './admin-agent.service';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { RequestWithUser } from '../../core/interfaces/request-with-user.interface';
import { AgentRequestDto } from './dto/agent-request.dto';

@ApiTags('Admin Agent')
@ApiBearerAuth()
@Controller('admin-agent')
export class AdminAgentController {
  private readonly logger = new Logger(AdminAgentController.name);

  constructor(private readonly adminAgentService: AdminAgentService) {}

  @UseGuards(JwtAuthGuard)
  @Get('sessions')
  @ApiOperation({
    summary: 'Get all chat sessions',
    description: 'Retrieves all past chat sessions belonging to the authenticated user.',
  })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Limit the number of recent sessions.' })
  @ApiResponse({ status: 200, description: 'Sessions retrieved successfully.' })
  async getSessions(
    @Req() req: RequestWithUser,
    @Query('limit') limit?: number,
  ) {
    if (!req.user) {
      throw new UnauthorizedException();
    }
    return this.adminAgentService.getSessions(req.user.sub, limit ? Number(limit) : undefined);
  }

  @UseGuards(JwtAuthGuard)
  @Get('sessions/:id/messages')
  @ApiOperation({
    summary: 'Get session messages history',
    description: 'Retrieves all historical chat messages belonging to a specific session ID.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'The unique numeric ID of the chat session.' })
  @ApiResponse({ status: 200, description: 'Historical messages loaded successfully.' })
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
    description: 'Creates a new empty chat session belonging to the authenticated user.',
  })
  @ApiResponse({ status: 201, description: 'Chat session created successfully.' })
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
    description: 'Deletes a specific chat session and all its messages permanently.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'The chat session ID to delete.' })
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
  @Post('query-stream')
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiOperation({
    summary: 'Query Admin agent (stream)',
    description: 'Streams the model output back to the client. Supports persisting within a specific session.',
  })
  @ApiResponse({
    status: 200,
    description: 'SSE stream opened; response body is streamed incrementally',
  })
  @ApiUnauthorizedResponse({ description: 'Missing/invalid access token' })
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
      const stream = this.adminAgentService.queryDatabaseStream(dto.prompt, userId, dto.sessionId);

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