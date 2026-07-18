import { Controller, Post, Delete, Param, UseGuards, NotFoundException, Body, BadRequestException, UnauthorizedException, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { RequestWithUser } from '../../core/interfaces/request-with-user.interface';
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

  @Delete('test-results/:id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Delete a test result' })
  async deleteTestResult(@Param('id') id: string) {
    return this.dbProviderService.deleteTestResult(+id);
  }

  @Post('set-default-model')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Set the authenticated user\'s default LLM model' })
  async setDefaultModel(@Body('modelId') modelId: number, @Req() req: RequestWithUser) {
    if (!req.user) {
      throw new UnauthorizedException();
    }
    if (!modelId || typeof modelId !== 'number') {
      throw new BadRequestException('modelId is required and must be a number');
    }
    await this.dbProviderService.setUserDefaultModel(req.user.sub, modelId);
    return { success: true, message: 'Default model set' };
  }
}