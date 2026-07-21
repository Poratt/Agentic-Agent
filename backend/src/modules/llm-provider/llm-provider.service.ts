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
import { UserLlmDefaultEntity } from './entities/user-llm-default.entity';

@Injectable()
export class LlmProviderService {
  constructor(
    @InjectRepository(LlmProviderEntity)
    private readonly providerRepo: Repository<LlmProviderEntity>,
    @InjectRepository(LlmModelEntity)
    private readonly modelRepo: Repository<LlmModelEntity>,
    @InjectRepository(LlmModelTestResultEntity)
    private readonly testResultRepo: Repository<LlmModelTestResultEntity>,
    @InjectRepository(UserLlmDefaultEntity)
    private readonly userDefaultRepo: Repository<UserLlmDefaultEntity>,
  ) { }

  /**
   * Resolves the effective provider and model for a request, applying user-level defaults.
   *
   * Resolution order:
   *   1. Explicit providerOverride + modelOverride from the request
   *   2. User's persisted default model (if a userId is supplied)
   *   3. Legacy environment-backed active provider / model
   *
   * @param providerOverride Optional per-request provider override.
   * @param modelOverride Optional per-request model override.
   * @param userId Optional user id to look up user-level defaults.
   * @param legacyProvider Fallback provider from the AI_PROVIDER env var.
   * @param legacyModel Fallback model from the AI_PROVIDER env var.
   * @returns Resolved provider and model.
   */
  async resolveEffectiveModel(
    providerOverride: string | undefined,
    modelOverride: string | undefined,
    userId: number | undefined,
    legacyProvider: string,
    legacyModel: string,
  ): Promise<{ provider: string; model: string }> {
    // 1. Explicit overrides win
    if (providerOverride && modelOverride) {
      return { provider: providerOverride, model: modelOverride };
    }

    // 2. User-level default model
    if (userId) {
      const userDefault = await this.getUserDefaultModel(userId);
      if (userDefault) {
        return {
          provider: userDefault.provider.key,
          model: userDefault.key,
        };
      }
    }

    // 3. Partial override (only provider or only model)
    if (providerOverride) {
      return { provider: providerOverride, model: legacyModel };
    }
    if (modelOverride) {
      return { provider: legacyProvider, model: modelOverride };
    }

    // 4. Legacy fallback
    return { provider: legacyProvider, model: legacyModel };
  }

  /**
   * Sets the user's default model.
   */
  async setUserDefaultModel(userId: number, modelId: number): Promise<void> {
    const model = await this.modelRepo.findOne({ where: { id: modelId }, relations: ['provider'] });
    if (!model || !model.active) {
      throw new NotFoundException('Model not found or inactive');
    }

    const existing = await this.userDefaultRepo.findOne({ where: { userId } });
    const row = existing ?? this.userDefaultRepo.create({ userId, modelId });
    row.modelId = modelId;
    await this.userDefaultRepo.save(row);
  }

  /**
   * Gets the user's default model entity (with provider relation).
   */
  async getUserDefaultModel(userId: number): Promise<LlmModelEntity | null> {
    const row = await this.userDefaultRepo.findOne({ where: { userId } });
    if (!row) return null;

    return this.modelRepo.findOne({
      where: { id: row.modelId },
      relations: ['provider'],
    });
  }

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

  async deleteModel(id: number): Promise<ServiceResultContainer<void>> {
    const model = await this.modelRepo.findOneBy({ id });
    if (!model) throw new NotFoundException('Model not found');

    await this.modelRepo.remove(model);
    return { success: true, message: 'Model deleted', result: undefined };
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

  async deleteTestResultsForModel(modelId: number): Promise<ServiceResultContainer<number>> {
    const result = await this.testResultRepo.delete({ modelId });
    const deleted = result.affected ?? 0;
    return { success: true, message: `Deleted ${deleted} test results`, result: deleted };
  }

  async deleteOldTestResults(retentionDays = 30): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - retentionDays);
    const result = await this.testResultRepo.delete({ createdAt: LessThan(cutoff) });
    return result.affected ?? 0;
  }

  async findTestResults(limit = 50, offset = 0): Promise<ServiceResultContainer<{ results: LlmModelTestResultEntity[]; total: number }>> {
    const [results, total] = await this.testResultRepo.findAndCount({
      relations: ['model', 'model.provider'],
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
    return { success: true, message: 'Test results retrieved', result: { results, total } };
  }

}