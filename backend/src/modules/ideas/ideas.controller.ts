import { Controller, Post, Get, Body, Query, Sse, ServiceUnavailableException, UseGuards, Req } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Observable, Subscriber } from 'rxjs';
import { MessageEvent } from '@nestjs/common';
import { IdeasService } from './ideas.service';
import { GenerateIdeasDto } from './dto/generate-ideas.dto';
import { GenerateIdeasResponseDto } from './dto/idea-result.dto';
import { GenerateIdeasResponse } from './interfaces/idea.interface';
import { CustomApiOperationOptions } from '../../core/types/custom-api-operation-options.type';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { RequestWithUser } from '../../core/interfaces/request-with-user.interface';

@ApiTags('ideas')
@Controller('ideas')
export class IdeasController {
  constructor(private readonly ideasService: IdeasService) {}

  @UseGuards(JwtAuthGuard)
  @Post('generate')
  async generate(@Req() req: RequestWithUser, @Body() dto: GenerateIdeasDto): Promise<GenerateIdeasResponse> {
    try {
      const userId = req.user?.sub;
      return await this.ideasService.generateIdeas(dto.domain, dto.count ?? 5, undefined, userId, dto.provider, dto.model);
    } catch (error) {
      if (error instanceof Error && error.name === 'BadRequestException') {
        throw error;
      }
      throw new ServiceUnavailableException('שירות יצירת הרעיונות אינו זמין כרגע');
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('generate/stream')
  @Sse()
  @ApiOperation({
    summary: 'Generate business ideas with real-time progress (SSE)',
    summaryHe: 'מייצר רעיונות עסקיים עם פרוגרס בזמן אמת (SSE)',
    toolIcon: 'ph-lightbulb',
    description:
      'Same flow as POST /ideas/generate but streams progress events (phase 0 → 1 → 2) over Server-Sent Events. Final event carries the full GenerateIdeasResponse. Use this when the UI needs a real progress bar.',
  } as CustomApiOperationOptions)
  @ApiResponse({ status: 200, description: 'SSE stream of progress events' })
  stream(@Req() req: RequestWithUser, @Query() dto: GenerateIdeasDto): Observable<MessageEvent> {
    const userId = req.user?.sub;
    const count = dto.count ?? 5;
    return new Observable<MessageEvent>((subscriber: Subscriber<MessageEvent>) => {
      this.ideasService
        .generateIdeas(dto.domain, count, (event) => {
          subscriber.next({ data: JSON.stringify(event) });
        }, userId, dto.provider, dto.model)
        .then(() => subscriber.complete())
        .catch((error: unknown) => {
          const message = error instanceof Error ? error.message : 'Unknown error';
          subscriber.next({
            data: JSON.stringify({ phase: 'error', message }),
          });
          subscriber.complete();
        });
    });
  }
}
