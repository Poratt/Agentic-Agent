import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ServiceResultContainer } from '../../core/models/service-result-container.model';
import { CreateLlmModelDto } from './dto/create-llm-model.dto';
import { CreateLlmProviderDto } from './dto/create-llm-provider.dto';
import { UpdateLlmModelDto } from './dto/update-llm-model.dto';
import { UpdateLlmProviderDto } from './dto/update-llm-provider.dto';
import { LlmModelEntity } from './entities/llm-model.entity';
import { LlmProviderEntity } from './entities/llm-provider.entity';

@Injectable()
export class LlmProviderService {
  constructor(
    @InjectRepository(LlmProviderEntity)
    private readonly providerRepo: Repository<LlmProviderEntity>,
    @InjectRepository(LlmModelEntity)
    private readonly modelRepo: Repository<LlmModelEntity>,
  ) { }

  async createProvider(dto: CreateLlmProviderDto): Promise<ServiceResultContainer<LlmProviderEntity>> {
    const provider = this.providerRepo.create(dto);
    const saved = await this.providerRepo.save(provider);
    return { success: true, message: 'Provider created', result: saved };
  }

  async updateProvider(id: number, dto: UpdateLlmProviderDto): Promise<ServiceResultContainer<LlmProviderEntity>> {
    const provider = await this.providerRepo.findOneBy({ id });
    if (!provider) throw new NotFoundException('Provider not found');

    Object.assign(provider, dto);
    const saved = await this.providerRepo.save(provider);
    return { success: true, message: 'Provider updated', result: saved };
  }

  async findProviders(): Promise<ServiceResultContainer<LlmProviderEntity[]>> {
    const providers = await this.providerRepo.find({ relations: ['models'] });
    return { success: true, message: 'Providers retrieved', result: providers };
  }

  async createModel(providerId: number, dto: CreateLlmModelDto): Promise<ServiceResultContainer<LlmModelEntity>> {
    const model = this.modelRepo.create({ ...dto, providerId });
    const saved = await this.modelRepo.save(model);
    return { success: true, message: 'Model created', result: saved };
  }

  async updateModel(id: number, dto: UpdateLlmModelDto): Promise<ServiceResultContainer<LlmModelEntity>> {
    const model = await this.modelRepo.findOneBy({ id });
    if (!model) throw new NotFoundException('Model not found');

    Object.assign(model, dto);
    const saved = await this.modelRepo.save(model);
    return { success: true, message: 'Model updated', result: saved };
  }

  async findModelsByProvider(providerId: number): Promise<ServiceResultContainer<LlmModelEntity[]>> {
    const models = await this.modelRepo.find({ where: { providerId }, order: { sortOrder: 'ASC' } });
    return { success: true, message: 'Models retrieved', result: models };
  }
}


