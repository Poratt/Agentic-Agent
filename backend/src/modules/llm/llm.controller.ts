import { Controller, Post, Param, UseGuards, NotFoundException } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { LlmHealthService } from './services/llm-health.service';
import { LlmProviderService } from '../llm-provider/llm-provider.service';

@ApiTags('llm')
@ApiBearerAuth()
@Controller('llm')
export class LlmController {
  constructor(
    private readonly healthService: LlmHealthService,
    private readonly dbProviderService: LlmProviderService,
  ) { }

  @Post('models/:id/test')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Test a single model connectivity and save the result' })
  async testModel(@Param('id') id: string) {
    const dbModel = await this.dbProviderService.findModelById(+id);
    if (!dbModel) {
      throw new NotFoundException('Model not found');
    }

    return this.healthService.testLlm(
      dbModel.provider.key as any,
      dbModel.key,
      'Hello! This is an interactive connection test.',
      'You are a helpful assistant.',
    );
  }
}