// import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
// import { ServiceResultContainer } from '../../../core/models/service-result-container.model';
// import { LlmModelGroupDto } from '../dto/llm-model-group.dto';
// import { LlmProviderDto } from '../dto/llm-provider.dto';
// import { OllamaModel, OllamaTagsResponse } from '../types/ollama.types';
// import { LlmProviderConfigService } from './llm-provider-config.service';

// @Injectable()
// export class LlmModelCatalogService implements OnModuleInit {
//   private readonly logger = new Logger(LlmModelCatalogService.name);

//   constructor(private readonly providerConfig: LlmProviderConfigService) {}

//   onModuleInit(): void {
//     setTimeout(() => {
//       void this.printLocalOllamaModels();
//     }, 1500);
//   }

//   async getProviders(): Promise<ServiceResultContainer<LlmProviderDto[]>> {
//     const activeProvider = this.providerConfig.getActiveProvider();

//     const providerDtos = await Promise.all(
//       this.providerConfig.getProviders().map(async (provider) => {
//         const config = this.providerConfig.getProviderConfig(provider);
//         const configured = this.providerConfig.isProviderConfigured(config);
//         const ollamaModels = provider === 'ollama' && configured ? await this.getSafeLocalOllamaModels() : [];

//         return {
//           id: provider,
//           active: provider === activeProvider,
//           configured,
//           available: provider === 'ollama' ? ollamaModels.length > 0 : configured,
//           configuredModel: config.model || undefined,
//           models: ollamaModels.length > 0 ? ollamaModels.map((model) => model.name) : undefined,
//         };
//       }),
//     );

//     return {
//       success: true,
//       message: 'LLM providers retrieved successfully.',
//       result: providerDtos,
//     };
//   }

//   async getModelOptions(): Promise<ServiceResultContainer<LlmModelGroupDto[]>> {
//     const ollamaModels = await this.getSafeLocalOllamaModels();

//     const { regularModels, cloudModels } = separateOllamaModels(ollamaModels);

//     const modelGroups: LlmModelGroupDto[] = [
//       ...LLM_STATIC_MODEL_GROUPS,
//       {
//         label: 'ollama',
//         items: toModelItems(regularModels),
//       },
//       {
//         label: 'ollama-cloud',
//         items: toModelItems(cloudModels),
//       },
//     ];

//     return {
//       success: true,
//       message: 'LLM model options retrieved successfully.',
//       result: modelGroups,
//     };
//   }

//   async printLocalOllamaModels(): Promise<void> {
//     if (this.providerConfig.getActiveProvider() !== 'ollama') {
//       return;
//     }

//     try {
//       const models = await this.getLocalOllamaModels();
//       if (models.length === 0) {
//         return;
//       }

//       this.logger.log('--- START OF LOCAL OLLAMA MODELS ---');

//       const modelWidth = Math.max(...models.map((model) => model.name.length || 0));
//       const sizeWidth = Math.max(...models.map((model) => (model.size ?? 0).toString().length || 0));

//       models.forEach((model) => {
//         const sizeInGb = ((model.size ?? 0) / (1024 * 1024 * 1024)).toFixed(2);
//         this.logger.log(
//           `Model: "${model.name.padEnd(modelWidth)}" | Size: ${sizeInGb.padEnd(sizeWidth)} GB | Family: ${model.details?.family || 'N/A'}`,
//         );
//       });

//       this.logger.log('--- END OF LOCAL OLLAMA MODELS ---');
//     } catch (error: unknown) {
//       this.logger.warn(`Could not automatically query local Ollama models: ${this.getErrorMessage(error)}`);
//     }
//   }

//   async getSafeLocalOllamaModels(): Promise<OllamaModel[]> {
//     try {
//       return await this.getLocalOllamaModels();
//     } catch (error: unknown) {
//       this.logger.warn(`Could not query local Ollama models: ${this.getErrorMessage(error)}`);
//       return [];
//     }
//   }

//   private async getLocalOllamaModels(): Promise<OllamaModel[]> {
//     const config = this.providerConfig.getProviderConfig('ollama');
//     const rawBaseUrl = config.baseUrl.replace('/v1', '');
//     const response = await fetch(`${rawBaseUrl}/api/tags`);

//     if (!response.ok) {
//       return [];
//     }

//     const data = (await response.json()) as OllamaTagsResponse;
//     return data.models ?? [];
//   }

//   private getErrorMessage(error: unknown): string {
//     if (error instanceof Error) {
//       return error.message;
//     }

//     return 'Unknown error';
//   }
// }

// function separateOllamaModels(models: OllamaModel[]) {
//   const regular: OllamaModel[] = [];
//   const cloud: OllamaModel[] = [];

//   for (const model of models) {
//     const name = model.name.toLowerCase();

//     if (name.includes('cloud')) {
//       cloud.push(model);
//     } else if (!isEmbeddingModel(name)) {
//       regular.push(model);
//     }
//   }

//   return { regularModels: regular, cloudModels: cloud };
// }

// function isEmbeddingModel(name: string): boolean {
//   return (
//     name.includes('embed') ||
//     name.includes('embedding') ||
//     name === 'all-minilm' ||
//     name.startsWith('nomic-embed') ||
//     name.startsWith('mxbai-embed')
//   );
// }

// function toModelItems(models: OllamaModel[]): { value: string; label: string }[] {
//   return models
//     .map((model) => ({
//       value: model.name,
//       label: model.name,
//     }))
//     .sort((a, b) => a.label.localeCompare(b.label));
// }
