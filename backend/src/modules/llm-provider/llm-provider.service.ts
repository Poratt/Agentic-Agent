import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';

import { ServiceResultContainer } from '../../core/models/service-result-container.model';
import { CreateLlmModelDto } from './dto/create-llm-model.dto';
import { CreateLlmProviderDto } from './dto/create-llm-provider.dto';
import { UpdateLlmModelDto } from './dto/update-llm-model.dto';
import { UpdateLlmProviderDto } from './dto/update-llm-provider.dto';
import { LlmModelEntity } from './entities/llm-model.entity';
import { LlmProviderEntity } from './entities/llm-provider.entity';
import { LlmModelTestResultEntity } from './entities/llm-model-test-results.entity';

@Injectable()
export class LlmProviderService {
  constructor(
    @InjectRepository(LlmProviderEntity)
    private readonly providerRepo: Repository<LlmProviderEntity>,
    @InjectRepository(LlmModelEntity)
    private readonly modelRepo: Repository<LlmModelEntity>,
    @InjectRepository(LlmModelTestResultEntity)
    private readonly testResultRepo: Repository<LlmModelTestResultEntity>,
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
    // 🚀 אנחנו מנחים את TypeORM לטעון באופן אקטיבי גם את הבדיקות של המודלים, ולסדר אותן מהחדשה לישנה 🚀
    const providers = await this.providerRepo.find({
      relations: ['models', 'models.testResults'],
      order: {
        models: {
          sortOrder: 'ASC',
          testResults: {
            createdAt: 'DESC' // הבדיקה הכי חדשה תופיע ראשונה ב-UI!
          }
        }
      }
    });

    return { success: true, message: 'Providers retrieved', result: providers };
  }

  async findProviderByKey(key: string): Promise<LlmProviderEntity | null> {
    return this.providerRepo.findOne({ where: { key }, relations: ['models'] });
  }

  async createModel(providerId: number, dto: CreateLlmModelDto): Promise<ServiceResultContainer<LlmModelEntity>> {
    const provider = await this.providerRepo.findOneBy({ id: providerId });
    if (!provider) throw new NotFoundException(`Provider with ID ${providerId} not found`);

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

  // 🚀 שולף מודל ספציפי לפי מפתח (Key) 🚀
  async findModelByKey(key: string): Promise<LlmModelEntity | null> {
    return this.modelRepo.findOne({ where: { key } });
  }

  // 🚀 שולף מודל ספציפי לפי ID כולל פרטי הספק שלו 🚀
  async findModelById(id: number): Promise<LlmModelEntity | null> {
    return this.modelRepo.findOne({
      where: { id },
      relations: ['provider'],
    });
  }
  // 🚀 שומר את תוצאת הבדיקה במסד הנתונים 🚀
  async saveTestResult(
    modelId: number,
    responseTimeMs: number,
    status: 'success' | 'error' | 'timeout',
    errorMessage: string | null,
  ): Promise<LlmModelTestResultEntity> {
    const testResult = this.testResultRepo.create({
      modelId,
      responseTimeMs,
      status,
      errorMessage,
    });
    return this.testResultRepo.save(testResult);
  }

  async deleteTestResult(testResultId: number): Promise<ServiceResultContainer<void>> {
    const testResult = await this.testResultRepo.findOneBy({ id: testResultId });
    if (!testResult) throw new NotFoundException('Test result not found');

    await this.testResultRepo.remove(testResult);
    return { success: true, message: 'Test result deleted', result: undefined };
  }

  async deleteOldTestResults(retentionDays = 30): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - retentionDays);
    const result = await this.testResultRepo.delete({ createdAt: LessThan(cutoff) });
    return result.affected ?? 0;
  }

  async setDefaultModel(modelId: number): Promise<ServiceResultContainer<LlmModelEntity>> {
    const model = await this.modelRepo.findOneBy({ id: modelId });
    if (!model) throw new NotFoundException('Model not found');

    // Unset isDefault on all models for this provider
    await this.modelRepo.update({ providerId: model.providerId }, { isDefault: false });

    // Set isDefault on the target model
    model.isDefault = true;
    const saved = await this.modelRepo.save(model);

    return { success: true, message: 'Default model updated', result: saved };
  }
}