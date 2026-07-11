import { Controller, Get, Post, Patch, Param, Body, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiCreatedResponse, ApiBadRequestResponse, ApiUnauthorizedResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { LlmProviderService } from './llm-provider.service';
import { CreateLlmProviderDto } from './dto/create-llm-provider.dto';
import { UpdateLlmProviderDto } from './dto/update-llm-provider.dto';
import { CreateLlmModelDto } from './dto/create-llm-model.dto';
import { UpdateLlmModelDto } from './dto/update-llm-model.dto';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { ServiceResultContainer } from '../../core/models/service-result-container.model';
import { LlmProviderEntity } from './entities/llm-provider.entity';
import { LlmModelEntity } from './entities/llm-model.entity';

/**
 * LlmProviderController manages the configuration of LLM providers and their associated models.
 * Base path: /llm-provider
 */
@ApiTags('LLM Provider')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('llm-provider')
export class LlmProviderController {
  constructor(private readonly service: LlmProviderService) {}

  @Post()
  @ApiOperation({ summary: 'Create new provider', description: 'Adds a new LLM provider to the system configuration.' })
  @ApiCreatedResponse({ description: 'Provider created successfully' })
  @ApiUnauthorizedResponse({ description: 'JWT token missing or invalid' })
  async create(@Body() dto: CreateLlmProviderDto): Promise<ServiceResultContainer<LlmProviderEntity>> {
    return this.service.createProvider(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all providers', description: 'Retrieves a list of all configured LLM providers.' })
  @ApiOkResponse({ description: 'List of providers retrieved' })
  @ApiUnauthorizedResponse({ description: 'JWT token missing or invalid' })
  async findAll(): Promise<ServiceResultContainer<LlmProviderEntity[]>> {
    return this.service.findProviders();
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update provider', description: 'Updates an existing LLM provider configuration.' })
  @ApiOkResponse({ description: 'Provider updated successfully' })
  @ApiBadRequestResponse({ description: 'Invalid provider ID' })
  @ApiUnauthorizedResponse({ description: 'JWT token missing or invalid' })
  async update(@Param('id') id: string, @Body() dto: UpdateLlmProviderDto): Promise<ServiceResultContainer<LlmProviderEntity>> {
    return this.service.updateProvider(+id, dto);
  }

  @Post(':id/models')
  @ApiOperation({ summary: 'Add model to provider', description: 'Creates a new model associated with the specified provider.' })
  @ApiCreatedResponse({ description: 'Model created successfully' })
  @ApiUnauthorizedResponse({ description: 'JWT token missing or invalid' })
  async createModel(@Param('id') id: string, @Body() dto: CreateLlmModelDto): Promise<ServiceResultContainer<LlmModelEntity>> {
    return this.service.createModel(+id, dto);
  }

  @Patch('models/:id')
  @ApiOperation({ summary: 'Update model', description: 'Updates an existing LLM model configuration.' })
  @ApiOkResponse({ description: 'Model updated successfully' })
  @ApiUnauthorizedResponse({ description: 'JWT token missing or invalid' })
  async updateModel(@Param('id') id: string, @Body() dto: UpdateLlmModelDto): Promise<ServiceResultContainer<LlmModelEntity>> {
    return this.service.updateModel(+id, dto);
  }

  @Get(':id/models')
  @ApiOperation({ summary: 'Get models for provider', description: 'Retrieves all models associated with the given provider.' })
  @ApiOkResponse({ description: 'List of models retrieved' })
  @ApiUnauthorizedResponse({ description: 'JWT token missing or invalid' })
  async findModels(@Param('id') id: string): Promise<ServiceResultContainer<LlmModelEntity[]>> {
    return this.service.findModelsByProvider(+id);
  }

  @Post('cleanup-test-results')
  @ApiOperation({ summary: 'Delete old test results', description: 'Manually triggers cleanup of LLM test results older than retention period.' })
  @ApiQuery({ name: 'retentionDays', required: false, type: Number, description: 'Delete results older than N days (default: 30)' })
  @ApiOkResponse({ description: 'Number of deleted rows' })
  @ApiUnauthorizedResponse({ description: 'JWT token missing or invalid' })
  async cleanupTestResults(@Query('retentionDays') retentionDays?: number): Promise<ServiceResultContainer<number>> {
    const deleted = await this.service.deleteOldTestResults(retentionDays ?? 30);
    return { success: true, message: `Deleted ${deleted} rows`, result: deleted };
  }
}
