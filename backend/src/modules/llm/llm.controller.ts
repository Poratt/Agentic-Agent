import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { CustomApiOperationOptions } from '../../core/types/custom-api-operation-options.type';
import { LlmModelGroupResultResponseDto } from './dto/llm-model-group-result-response.dto';
import { LlmProviderResultResponseDto } from './dto/llm-provider-result-response.dto';
import { LlmStatusResultResponseDto } from './dto/llm-status-result-response.dto';
import { LlmService } from './llm.service';
import { GenUiSpec } from '../admin-agent/constants/gen-ui-spec.constant';
import { LlmProvider } from './types/llm.types';

@ApiTags('llm')
@ApiBearerAuth()
@Controller('llm')
export class LlmController {
  constructor(private readonly llmService: LlmService) { }

  @Get('providers')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Get available LLM providers',
    summaryHe: 'שולף את ספקי ה-LLM הזמינים בשרת',
    toolIcon: 'ph-brain',
    description: 'Returns safe provider metadata without exposing API keys, base URLs, or secret headers.',
  } as CustomApiOperationOptions)
  @ApiOkResponse({
    description: 'LLM providers retrieved successfully.',
    type: LlmProviderResultResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Missing or expired JWT token.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected server error.' })
  getProviders() {
    return this.llmService.getProviders();
  }

  @Get('model-options')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Get grouped LLM model options',
    summaryHe: 'שולף רשימת מודלים מקובצת לבחירה בצאט',
    toolIcon: 'ph-brain',
    description: 'Returns grouped by provider model options for the chat model selector, including static provider catalogs and local Ollama models.',
  } as CustomApiOperationOptions)
  @ApiOkResponse({
    description: 'LLM model options retrieved successfully.',
    type: LlmModelGroupResultResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Missing or expired JWT token.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected server error.' })
  getModelOptions() {
    return this.llmService.getModelOptions();
  }

  @Get('status')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Get active LLM runtime status',
    summaryHe: 'שולף את סטטוס ספק ומודל ה-LLM הפעילים',
    toolIcon: 'ph-brain',
    description: 'Returns the active provider and model plus safe provider availability metadata.',
  } as CustomApiOperationOptions)
  @ApiOkResponse({
    description: 'LLM status retrieved successfully.',
    type: LlmStatusResultResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Missing or expired JWT token.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected server error.' })
  getStatus() {
    return this.llmService.getStatus();
  }

  @Get('llm-test')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Test if single model available and working',
    summaryHe: 'בודק שמודל LLM בודד פעיל וזמין',
    toolIcon: 'ph-brain',
    genUiSpec: GenUiSpec.LLM_TEST_RESULTS,
    description: 'Sends a minimal health prompt to Selected LLM provider and returns whether the model responded.',
  } as CustomApiOperationOptions)
  @ApiOkResponse({
    description: 'LLM check completed successfully.',
  })
  @ApiUnauthorizedResponse({ description: 'Missing or expired JWT token.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected server error.' })
  testLlm(
    @Query('provider') provider: LlmProvider,
    @Query('model') model: string,
    @Query('prompt') prompt: string,
    @Query('systemContext') systemContext: string,
  ) {
    return this.llmService.testLlm(provider, model, prompt, systemContext);
  }

  @Get('test-all')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Test all configured LLM models in parallel',
    summaryHe: 'בודק את כל מודלי ה-LLM המוגדרים במקביל ומחזיר סטטוס ריצה',
    toolIcon: 'ph-cpu',
    genUiSpec: GenUiSpec.LLM_TEST_RESULTS,
    description: 'Runs parallel connectivity tests across all configured LLM models and aggregates their statuses.',
  } as CustomApiOperationOptions)
  @ApiOkResponse({
    description: 'All LLM models tested successfully.',
  })
  @ApiUnauthorizedResponse({ description: 'Missing or expired JWT token.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected server error.' })
  testAll() {
    return this.llmService.testAllModels();
  }
}