import { DataSource, Repository } from 'typeorm';
import { LlmModelEntity } from '../../modules/llm-provider/entities/llm-model.entity';
import { LlmProviderEntity } from '../../modules/llm-provider/entities/llm-provider.entity';

const OPENROUTER_MODELS = [
    { value: 'google/gemma-4-31b-it:free', label: 'Gemma 4 31b IT' },
    { value: 'google/gemma-4-26b-a4b-it:free', label: 'Gemma 4 26b A4B IT' },
    { value: 'nvidia/nemotron-3-super-120b-a12b:free', label: 'Nemotron 3 Super 120b A12B' },
    { value: 'nvidia/nemotron-3-ultra-550b-a55b:free', label: 'Nemotron 3 Ultra 550b A55B' },
    { value: 'z-ai/glm-4.5-air:free', label: 'GLM 4.5 Air' },
    { value: 'poolside/laguna-xs.2:free', label: 'Laguna XS.2' },
];

const NVIDIA_MODELS = [
    { value: 'qwen/qwen3-next-80b-a3b-instruct', label: 'Qwen3 Next 80b A3B Instruct' },
    { value: 'openai/gpt-oss-20b', label: 'GPT OSS 20B' },
    { value: 'mistralai/mistral-medium-3.5-128b', label: 'Mistral Medium 3.5 128B' },
    { value: 'deepseek-ai/deepseek-v4-flash', label: 'DeepSeek V4 Flash' },
    { value: 'meta/llama-4-maverick-17b-128e-instruct', label: 'META Llama 4 Maverick 17B' },
    { value: 'moonshotai/kimi-k2.6', label: 'Kimi K2.6' },
    { value: 'stepfun-ai/step-3.7-flash', label: 'Step 3.7 Flash' },
    { value: 'nvidia/nemotron-3-ultra-550b-a55b', label: 'Nemotron 3 Ultra 550b A55B' },
];

export async function seedLlmProviders(dataSource: DataSource): Promise<void> {
    const providerRepo = dataSource.getRepository(LlmProviderEntity);
    const modelRepo = dataSource.getRepository(LlmModelEntity);

    try {
        // OpenRouter
        let openrouter = await providerRepo.findOne({
            where: { key: 'openrouter' },
            relations: ['models'],
        });

        if (!openrouter) {
            openrouter = new LlmProviderEntity();
            openrouter.key = 'openrouter';
            openrouter.label = 'OpenRouter';
            openrouter.baseUrl = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
            openrouter.apiKey = process.env.OPENROUTER_API_KEY || '';
            openrouter.active = true;

            openrouter = await providerRepo.save(openrouter);

            for (const modelData of OPENROUTER_MODELS) {
                const model = new LlmModelEntity();
                model.key = modelData.value;
                model.label = modelData.label;
                model.active = true;
                model.providerId = openrouter.id;
                await modelRepo.save(model);
            }

            console.log('[Seed] OpenRouter provider and models created.');
        } else {
            console.log('[Seed] OpenRouter provider already exists.');
        }

        // NVIDIA
        let nvidia = await providerRepo.findOne({
            where: { key: 'nvidia' },
            relations: ['models'],
        });

        if (!nvidia) {
            nvidia = new LlmProviderEntity();
            nvidia.key = 'nvidia';
            nvidia.label = 'NVIDIA NIM';
            nvidia.baseUrl = process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1';
            nvidia.apiKey = process.env.NVIDIA_API_KEY || '';
            nvidia.active = true;

            nvidia = await providerRepo.save(nvidia);

            for (const modelData of NVIDIA_MODELS) {
                const model = new LlmModelEntity();
                model.key = modelData.value;
                model.label = modelData.label;
                model.active = true;
                model.providerId = nvidia.id;
                await modelRepo.save(model);
            }

            console.log('[Seed] NVIDIA provider and models created.');
        } else {
            console.log('[Seed] NVIDIA provider already exists.');
        }
    } catch (error) {
        console.error('[Seed] Error seeding LLM providers:', error);
    }
}
