import {
  Body,
  Controller,
  Logger,
  Post,
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
  @Post('query-stream')
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiOperation({
    summary: 'Query Admin agent (stream)',
    description: 'Streams the model output back to the client using Server-Sent Events (SSE). Recommended for long generations.',
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
      const stream = this.adminAgentService.queryDatabaseStream(dto.prompt, userId);

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