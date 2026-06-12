// This file implements the LLM Admin Controller with CRUD endpoints for providers and models.

import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, ParseIntPipe } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiInternalServerErrorResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { AdminGuard } from '../../core/guards/admin.guard';
import { LlmProviderRegistryService } from './services/llm-provider-registry.service';
import { CreateProviderDto, UpdateProviderDto, ProviderResponseDto } from './dto/llm-provider.dto';
import { CreateModelDto, UpdateModelDto, ModelResponseDto } from './dto/llm-model.dto';
import { LlmAdminProviderResultResponseDto } from './dto/llm-admin-provider-result-response.dto';
import { LlmAdminModelResultResponseDto } from './dto/llm-admin-model-result-response.dto';
import { CustomApiOperationOptions } from '../../core/types/custom-api-operation-options.type';

/**
 * LLM Admin Controller
 *
 * Provides protected CRUD endpoints for managing LLM providers and models.
 * All routes are guarded by JWT authentication and an admin role check.
 */
@ApiTags('LLM Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('llm/admin')
export class LlmAdminController {
  constructor(private readonly registry: LlmProviderRegistryService) {}

  // ---------------------------------------------------------------------------
  // Provider endpoints
  // ---------------------------------------------------------------------------

  @Get('providers')
  @ApiOperation({
    summary: 'List all LLM providers',
    description: 'Returns all provider records with basic metadata (no secret keys).',
  } as CustomApiOperationOptions)
  @ApiOkResponse({ description: 'Providers retrieved.', type: LlmAdminProviderResultResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT.' })
  @ApiForbiddenResponse({ description: 'Admin role required.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected server error.' })
  getProviders() {
    return this.registry.findAllProvidersResult();
  }

  @Post('providers')
  @ApiOperation({
    summary: 'Create a new LLM provider',
    description: 'Creates a provider record. API key (if supplied) is stored encrypted.',
  } as CustomApiOperationOptions)
  @ApiCreatedResponse({ description: 'Provider created.', type: LlmAdminProviderResultResponseDto })
  @ApiBadRequestResponse({ description: 'Validation failed.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT.' })
  @ApiForbiddenResponse({ description: 'Admin role required.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected server error.' })
  @ApiBody({ type: CreateProviderDto })
  createProvider(@Body() dto: CreateProviderDto) {
    return this.registry.createProviderResult(dto);
  }

  @Patch('providers/:id')
  @ApiOperation({
    summary: 'Update an existing LLM provider',
    description: 'Partial update of provider fields. Empty apiKey keeps the existing encrypted key.',
  } as CustomApiOperationOptions)
  @ApiOkResponse({ description: 'Provider updated.', type: LlmAdminProviderResultResponseDto })
  @ApiBadRequestResponse({ description: 'Validation failed.' })
  @ApiNotFoundResponse({ description: 'Provider not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT.' })
  @ApiForbiddenResponse({ description: 'Admin role required.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected server error.' })
  @ApiParam({ name: 'id', type: Number, description: 'Provider database ID' })
  @ApiBody({ type: UpdateProviderDto })
  updateProvider(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateProviderDto) {
    return this.registry.updateProviderResult(id, dto);
  }

  @Delete('providers/:id')
  @ApiOperation({
    summary: 'Soft?`disable an LLM provider',
    description: 'Marks the provider as inactive. The record remains for historical purposes.',
  } as CustomApiOperationOptions)
  @ApiOkResponse({ description: 'Provider disabled.', type: LlmAdminProviderResultResponseDto })
  @ApiNotFoundResponse({ description: 'Provider not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT.' })
  @ApiForbiddenResponse({ description: 'Admin role required.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected server error.' })
  @ApiParam({ name: 'id', type: Number, description: 'Provider database ID' })
  disableProvider(@Param('id', ParseIntPipe) id: number) {
    return this.registry.disableProviderResult(id);
  }

  // ---------------------------------------------------------------------------
  // Model endpoints (nested under a provider)
  // ---------------------------------------------------------------------------

  @Get('providers/:providerId/models')
  @ApiOperation({
    summary: 'List models for a provider',
    description: 'Returns all model records belonging to the specified provider.',
  } as CustomApiOperationOptions)
  @ApiOkResponse({ description: 'Models retrieved.', type: LlmAdminModelResultResponseDto })
  @ApiNotFoundResponse({ description: 'Provider not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT.' })
  @ApiForbiddenResponse({ description: 'Admin role required.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected server error.' })
  @ApiParam({ name: 'providerId', type: Number, description: 'Provider database ID' })
  getModels(@Param('providerId', ParseIntPipe) providerId: number) {
    return this.registry.findModelsByProviderResult(providerId);
  }

  @Post('providers/:providerId/models')
  @ApiOperation({
    summary: 'Create a new model for a provider',
    description: 'Adds a model record under the given provider.',
  } as CustomApiOperationOptions)
  @ApiCreatedResponse({ description: 'Model created.', type: LlmAdminModelResultResponseDto })
  @ApiBadRequestResponse({ description: 'Validation failed.' })
  @ApiNotFoundResponse({ description: 'Provider not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT.' })
  @ApiForbiddenResponse({ description: 'Admin role required.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected server error.' })
  @ApiParam({ name: 'providerId', type: Number, description: 'Provider database ID' })
  @ApiBody({ type: CreateModelDto })
  createModel(
    @Param('providerId', ParseIntPipe) providerId: number,
    @Body() dto: CreateModelDto,
  ) {
    return this.registry.createModelResult(providerId, dto);
  }

  @Patch('models/:id')
  @ApiOperation({
    summary: 'Update an existing model',
    description: 'Partial update of model fields.',
  } as CustomApiOperationOptions)
  @ApiOkResponse({ description: 'Model updated.', type: LlmAdminModelResultResponseDto })
  @ApiBadRequestResponse({ description: 'Validation failed.' })
  @ApiNotFoundResponse({ description: 'Model not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT.' })
  @ApiForbiddenResponse({ description: 'Admin role required.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected server error.' })
  @ApiParam({ name: 'id', type: Number, description: 'Model database ID' })
  @ApiBody({ type: UpdateModelDto })
  updateModel(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateModelDto) {
    return this.registry.updateModelResult(id, dto);
  }

  @Delete('models/:id')
  @ApiOperation({
    summary: 'Soft?`disable a model',
    description: 'Marks the model as inactive. The record stays for audit purposes.',
  } as CustomApiOperationOptions)
  @ApiOkResponse({ description: 'Model disabled.', type: LlmAdminModelResultResponseDto })
  @ApiNotFoundResponse({ description: 'Model not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT.' })
  @ApiForbiddenResponse({ description: 'Admin role required.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected server error.' })
  @ApiParam({ name: 'id', type: Number, description: 'Model database ID' })
  disableModel(@Param('id', ParseIntPipe) id: number) {
    return this.registry.disableModelResult(id);
  }

  @Patch('providers/:providerId/default-model/:modelId')
  @ApiOperation({
    summary: 'Set the default model for a provider',
    description: 'Updates the provider record to point to the chosen model ID.',
  } as CustomApiOperationOptions)
  @ApiOkResponse({ description: 'Default model set.', type: LlmAdminProviderResultResponseDto })
  @ApiNotFoundResponse({ description: 'Provider or model not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT.' })
  @ApiForbiddenResponse({ description: 'Admin role required.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected server error.' })
  @ApiParam({ name: 'providerId', type: Number, description: 'Provider database ID' })
  @ApiParam({ name: 'modelId', type: Number, description: 'Model database ID' })
  setDefaultModel(
    @Param('providerId', ParseIntPipe) providerId: number,
    @Param('modelId', ParseIntPipe) modelId: number,
  ) {
    return this.registry.setDefaultModelResult(providerId, modelId);
  }
}
