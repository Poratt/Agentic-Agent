import { DataSource } from "typeorm";
import { LlmModelEntity } from "../../modules/llm-provider/entities/llm-model.entity";
import { LlmProviderEntity } from "../../modules/llm-provider/entities/llm-provider.entity";


const AppDataSource = new DataSource({
    type: 'mysql',
    host: 'localhost',
    port: 3306,
    username: 'root',
    password: 'password',
    database: 'my_app',
    synchronize: true,
    logging: true,
    entities: [LlmProviderEntity, LlmModelEntity]
});

const OPENROUTER_MODELS = [
    {
        value: 'google/gemma-4-31b-it:free',
        label: 'Gemma 4 31b IT'
    },
    {
        value: 'google/gemma-4-26b-a4b-it:free',
        label: 'Gemma 4 26b A4B IT'
    },
    {
        value: 'nvidia/nemotron-3-super-120b-a12b:free',
        label: 'Nemotron 3 Super 120b A12B(NVIDIA)'
    },
    {
        value: 'nvidia/nemotron-3-ultra-550b-a55b:free',
        label: 'Nemotron 3 Ultra 550b A55B(NVIDIA)'
    },
    {
        value: 'z-ai/glm-4.5-air:free',
        label: 'GLM 4.5 Air(Z.AI)'
    },
    {
        value: 'poolside/laguna-xs.2:free',
        label: 'Lagauna XS.2(Poolside)'
    }
];

const NVIDIA_MODELS = [
    {
        value: 'qwen/qwen3-next-80b-a3b-instruct',
        label: 'Qwen3 Next 80b A3B Instruct'
    },
    {
        value: 'openai/gpt-oss-20b',
        label: 'GPT OSS 20B'
    },
    {
        value: 'mistralai/mistral-medium-3.5-128b',
        label: 'Mistral Medium 3.5 128B'
    },
    {
        value: 'deepseek-ai/deepseek-v4-flash',
        label: 'DeepSeek V4 Flash'
    },
    {
        value: 'meta/llama-4-maverick-17b-128e-instruct',
        label: 'META Llama 4 Maverick 17B 128E Instruct'
    },
    {
        value: 'moonshotai/kimi-k2.6',
        label: 'Kimi K2.6'
    },
    {
        value: 'stepfun-ai/step-3.7-flash',
        label: 'Step 3.7 Flash'
    },
    {
        value: 'nvidia/nemotron-3-ultra-550b-a55b',
        label: 'Nemotron 3 Ultra 550b A55B'
    }
];

async function seedDatabase() {
    try {
        await AppDataSource.initialize();
        console.log('Database connection initialized.');

        const providerRepository = AppDataSource.getRepository(LlmProviderEntity);

        const openrouter = new LlmProviderEntity();
        openrouter.key = 'openrouter';
        openrouter.label = 'OpenRouter';
        openrouter.baseUrl = 'https://openrouter.ai/api/v1';
        openrouter.apiKey = '';
        openrouter.active = true;
        openrouter.models = OPENROUTER_MODELS.map((item) => {
            const model = new LlmModelEntity();
            model.key = item.value;
            model.label = item.label;
            model.active = true;
            model.provider = openrouter;
            return model;
        });

        const nvidia = new LlmProviderEntity();
        nvidia.key = 'nvidia';
        nvidia.label = 'NVIDIA NIM';
        nvidia.baseUrl = 'https://integrate.api.nvidia.com/v1';
        nvidia.apiKey = '';
        nvidia.active = true;
        nvidia.models = NVIDIA_MODELS.map((item) => {
            const model = new LlmModelEntity();
            model.key = item.value;
            model.label = item.label;
            model.active = true;
            model.provider = nvidia;
            return model;
        });

        await providerRepository.save(openrouter);
        console.log('OpenRouter provider and models successfully saved.');

        await providerRepository.save(nvidia);
        console.log('NVIDIA provider and models successfully saved.');
    } catch (error) {
        console.error('Error during database seeding:', error);
    } finally {
        if (AppDataSource.isInitialized) {
            await AppDataSource.destroy();
            console.log('Database connection closed.');
        }
    }
}

seedDatabase();