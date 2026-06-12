import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LlmProvider } from '../entities/llm-provider.entity';
import { LlmModel } from '../entities/llm-model.entity';
import { EncryptionService } from './encryption.service';
import { CreateProviderDto, UpdateProviderDto, ProviderResponseDto } from '../dto/llm-provider.dto';
import { CreateModelDto, UpdateModelDto, ModelResponseDto } from '../dto/llm-model.dto';
import { LlmProviderConfigService } from './llm-provider-config.service';
import { LlmModelCatalogService } from './llm-model-catalog.service';
import { ServiceResultContainer } from '../../../core/models/service-result-container.model';

@Injectable()
export class LlmProviderRegistryService {
  private readonly logger = new Logger(LlmProviderRegistryService.name);

  constructor(
    @InjectRepository(LlmProvider)
    private readonly providerRepo: Repository<LlmProvider>,
    @InjectRepository(LlmModel)
    private readonly modelRepo: Repository<LlmModel>,
    private readonly encryptionService: EncryptionService,
  ) {}

  async findAllProviders(): Promise<ProviderResponseDto[]> {
    const providers = await this.providerRepo.find({
      relations: ['models'],
    });

    return providers.map((p) => this.mapToResponseDto(p));
  }

  async findAllProvidersResult(): Promise<ServiceResultContainer<ProviderResponseDto[]>> {
    const result = await this.findAllProviders();
    return {
      success: true,
      message: 'LLM providers retrieved successfully.',
      result,
    };
  }

  async findProviderByIdResult(id: number): Promise<ServiceResultContainer<ProviderResponseDto>> {
    const result = await this.findProviderById(id);
    return {
      success: true,
      message: 'LLM provider retrieved successfully.',
      result,
    };
  }

  async createProviderResult(dto: CreateProviderDto): Promise<ServiceResultContainer<ProviderResponseDto>> {
    const result = await this.createProvider(dto);
    return {
      success: true,
      message: 'LLM provider created successfully.',
      result,
    };
  }

  async updateProviderResult(
    id: number,
    dto: UpdateProviderDto,
  ): Promise<ServiceResultContainer<ProviderResponseDto>> {
    const result = await this.updateProvider(id, dto);
    return {
      success: true,
      message: 'LLM provider updated successfully.',
      result,
    };
  }

  async disableProviderResult(id: number): Promise<ServiceResultContainer<null>> {
    await this.disableProvider(id);
    return {
      success: true,
      message: 'LLM provider disabled successfully.',
      result: null,
    };
  }

  async findModelsByProviderResult(
    providerId: number,
  ): Promise<ServiceResultContainer<ModelResponseDto[]>> {
    const result = await this.findModelsByProvider(providerId);
    return {
      success: true,
      message: 'LLM models retrieved successfully.',
      result,
    };
  }

  async createModelResult(
    providerId: number,
    dto: CreateModelDto,
  ): Promise<ServiceResultContainer<ModelResponseDto>> {
    const result = await this.createModel(providerId, dto);
    return {
      success: true,
      message: 'LLM model created successfully.',
      result,
    };
  }

  async updateModelResult(id: number, dto: UpdateModelDto): Promise<ServiceResultContainer<ModelResponseDto>> {
    const result = await this.updateModel(id, dto);
    return {
      success: true,
      message: 'LLM model updated successfully.',
      result,
    };
  }

  async disableModelResult(id: number): Promise<ServiceResultContainer<null>> {
    await this.disableModel(id);
    return {
      success: true,
      message: 'LLM model disabled successfully.',
      result: null,
    };
  }

  async setDefaultModelResult(providerId: number, modelId: number): Promise<ServiceResultContainer<null>> {
    await this.setDefaultModel(providerId, modelId);
    return {
      success: true,
      message: 'LLM default model updated successfully.',
      result: null,
    };
  }

  async findProviderById(id: number): Promise<ProviderResponseDto> {
    const provider = await this.providerRepo.findOne({
      where: { id },
      relations: ['models'],
    });

    if (!provider) {
      throw new NotFoundException(`LlmProvider with ID ${id} not found`);
    }

    return this.mapToResponseDto(provider);
  }

  async findProviderByKey(key: string): Promise<LlmProvider | null> {
    return this.providerRepo.findOne({ where: { key } });
  }

  async createProvider(dto: CreateProviderDto): Promise<ProviderResponseDto> {
    const exists = await this.providerRepo.findOne({ where: { key: dto.key } });
    if (exists) {
      this.logger.warn(`Provider with key ${dto.key} already exists. Skipping insert.`);
      return this.mapToResponseDto(exists);
    }

    const provider = this.providerRepo.create({
      ...dto,
      apiKeyEncrypted: dto.apiKey ? this.encryptionService.encrypt(dto.apiKey) : null,
    });

    const saved = await this.providerRepo.save(provider);
    return this.mapToResponseDto(saved);
  }

  async updateProvider(id: number, dto: UpdateProviderDto): Promise<ProviderResponseDto> {
    const provider = await this.providerRepo.findOne({
      where: { id },
      relations: ['models'],
    });

    if (!provider) {
      throw new NotFoundException(`LlmProvider with ID ${id} not found`);
    }

    const updateData: Partial<LlmProvider> = { ...dto };
    if (dto.apiKey !== undefined) {
      updateData.apiKeyEncrypted = dto.apiKey
        ? this.encryptionService.encrypt(dto.apiKey)
        : provider.apiKeyEncrypted;
    }
    Object.assign(provider, updateData);
    const saved = await this.providerRepo.save(provider);
    return this.mapToResponseDto(saved);
  }

  async disableProvider(id: number): Promise<void> {
    const provider = await this.providerRepo.findOne({ where: { id } });
    if (!provider) {
      throw new NotFoundException(`LlmProvider with ID ${id} not found`);
    }
    provider.active = false;
    await this.providerRepo.save(provider);
  }

  async findModelsByProvider(providerId: number): Promise<ModelResponseDto[]> {
    const models = await this.modelRepo.find({
      where: { providerId },
      order: { sortOrder: 'ASC' },
    });

    return models.map((m) => this.mapToModelResponseDto(m));
  }

  async createModel(providerId: number, dto: CreateModelDto): Promise<ModelResponseDto> {
    const exists = await this.modelRepo.findOne({
      where: { providerId, name: dto.name },
    });

    if (exists) {
      this.logger.warn(`Model ${dto.name} already exists for provider ${providerId}. Skipping insert.`);
      return this.mapToModelResponseDto(exists);
    }

    const model = this.modelRepo.create({
      ...dto,
      providerId,
    });

    const saved = await this.modelRepo.save(model);
    return this.mapToModelResponseDto(saved);
  }

  async updateModel(id: number, dto: UpdateModelDto): Promise<ModelResponseDto> {
    const model = await this.modelRepo.findOne({ where: { id } });
    if (!model) {
      throw new NotFoundException(`LlmModel with ID ${id} not found`);
    }

    Object.assign(model, dto);
    const saved = await this.modelRepo.save(model);
    return this.mapToModelResponseDto(saved);
  }

  async disableModel(id: number): Promise<void> {
    const model = await this.modelRepo.findOne({ where: { id } });
    if (!model) {
      throw new NotFoundException(`LlmModel with ID ${id} not found`);
    }
    model.active = false;
    await this.modelRepo.save(model);
  }

  async setDefaultModel(providerId: number, modelId: number): Promise<void> {
    const provider = await this.providerRepo.findOne({ where: { id: providerId } });
    if (!provider) {
      throw new NotFoundException(`LlmProvider with ID ${providerId} not found`);
    }

    const model = await this.modelRepo.findOne({ where: { id: modelId } });
    if (!model || model.providerId !== providerId) {
      throw new NotFoundException(`LlmModel with ID ${modelId} not found for this provider`);
    }

    provider.defaultModelId = modelId;
    await this.providerRepo.save(provider);
  }

  async getDecryptedApiKey(providerId: number): Promise<string | null> {
    const provider = await this.providerRepo.findOne({
      where: { id: providerId },
      select: ['id', 'apiKeyEncrypted'],
    });

    if (!provider || !provider.apiKeyEncrypted) {
      return null;
    }

    return this.encryptionService.decrypt(provider.apiKeyEncrypted);
  }

  private mapToResponseDto(provider: LlmProvider): ProviderResponseDto {
    return {
      id: provider.id,
      key: provider.key,
      label: provider.label,
      baseUrl: provider.baseUrl,
      hasApiKey: !!provider.apiKeyEncrypted,
      defaultModelId: provider.defaultModelId,
      active: provider.active,
      modelsCount: provider.models?.length ?? 0,
    };
  }

  private mapToModelResponseDto(model: LlmModel): ModelResponseDto {
    return {
      id: model.id,
      providerId: model.providerId,
      name: model.name,
      label: model.label,
      active: model.active,
      supportsStreaming: model.supportsStreaming,
      supportsTools: model.supportsTools,
      contextWindow: model.contextWindow,
      sortOrder: model.sortOrder,
      runtimeDiscovered: model.runtimeDiscovered,
    };
  }
}
