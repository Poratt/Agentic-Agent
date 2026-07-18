import { DataSource } from 'typeorm';
import { LlmModelEntity } from '../../modules/llm-provider/entities/llm-model.entity';
import { LlmProviderEntity } from '../../modules/llm-provider/entities/llm-provider.entity';

const OPENROUTER_MODELS = [
    { value: 'google/gemma-4-31b-it:free', label: 'Gemma 4 31b IT' },
    { value: 'google/gemma-4-26b-a4b-it:free', label: 'Gemma 4 26b A4B IT' },
    { value: 'nvidia/nemotron-3-super-120b-a12b:free', label: 'Nemotron 3 Super 120b A12B' },
    { value: 'nvidia/nemotron-3-nano-30b-a3b:free', label: 'Nemotron 3 Nano 30B A3B' },
    { value: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free', label: 'Nemotron 3 Nano Omni' },
    { value: 'nvidia/nemotron-nano-9b-v2:free', label: 'Nemotron Nano 9B V2' },
    { value: 'nvidia/nemotron-nano-12b-v2:free', label: 'Nemotron Nano 12B V2' },
    { value: 'nvidia/nemotron-3.5-content-safety:free', label: 'Nemotron 3.5 Content Safety' },
    { value: 'nvidia/llama-nemotron-embed-vl-1b-v2:free', label: 'Llama Nemotron Embed VL 1B V2' },
    { value: 'nvidia/llama-nemotron-rerank-vl-1b-v2:free', label: 'Llama Nemotron Rerank VL 1B V2' },
    { value: 'moonshotai/kimi-k2.6:free', label: 'Kimi K2.6' },
    { value: 'qwen/qwen3-coder:free', label: 'Qwen3 Coder 480B A35B' },
    { value: 'qwen/qwen3-next-80b-a3b-instruct:free', label: 'Qwen3 Next 80B A3B Instruct' },
    { value: 'meta-llama/llama-3.3-70b-instruct:free', label: 'Llama 3.3 70B Instruct' },
    { value: 'meta-llama/llama-3.2-3b-instruct:free', label: 'Llama 3.2 3B Instruct' },
    { value: 'nousresearch/hermes-3-llama-3.1-405b:free', label: 'Hermes 3 405B Instruct' },
    { value: 'deepseek/deepseek-v4-flash:free', label: 'DeepSeek V4 Flash' },
    { value: 'openai/gpt-oss-120b:free', label: 'GPT OSS 120B' },
    { value: 'openai/gpt-oss-20b:free', label: 'GPT OSS 20B' },
    { value: 'z-ai/glm-4.5-air:free', label: 'GLM 4.5 Air' },
    { value: 'minimax/minimax-m2.5:free', label: 'MiniMax M2.5' },
    { value: 'poolside/laguna-m.1:free', label: 'Laguna M.1' },
    { value: 'poolside/laguna-xs.2:free', label: 'Laguna XS.2' },
    { value: 'cohere/north-mini-code:free', label: 'North Mini Code' },
    { value: 'liquid/lfm-2.5-1.2b-thinking:free', label: 'LFM 2.5 1.2B Thinking' },
    { value: 'liquid/lfm-2.5-1.2b-instruct:free', label: 'LFM 2.5 1.2B Instruct' },
    { value: 'cognitivecomputations/dolphin-mistral-24b-venice-edition:free', label: 'Dolphin Mistral 24B' },
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

const AGNES_AI_MODELS = [
    { value: 'agnes-2.0-flash', label: 'Agnes 2.0 Flash' },
    { value: 'agnes-image-2.0-flash', label: 'Agnes Image 2.0 Flash' },
    { value: 'agnes-image-2.1-flash', label: 'Agnes Image 2.1 Flash' },
    { value: 'agnes-video-v2.0', label: 'Agnes Video V2.0' }
]

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

        // AGNES AI
        let agnes = await providerRepo.findOne({
            where: { key: 'agnes' },
            relations: ['models'],
        });

        if (!agnes) {
            agnes = new LlmProviderEntity();
            agnes.key = 'agnes';
            agnes.label = 'Agnes AI';
            agnes.baseUrl = process.env.AGNES_BASE_URL || 'https://api.agnes.ai/v1';
            agnes.apiKey = process.env.AGNES_API_KEY || '';
            agnes.active = true;

            agnes = await providerRepo.save(agnes);

            for (const modelData of AGNES_AI_MODELS) { }
            console.log('[Seed] Agnes AI provider and models created.');
        } else {
            console.log('[Seed] Agnes AI provider already exists.');
        }

    } catch (error) {
        console.error('[Seed] Error seeding LLM providers:', error);
    }
}
