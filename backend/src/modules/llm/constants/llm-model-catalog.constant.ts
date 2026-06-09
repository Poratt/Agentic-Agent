import { LlmModelGroupDto } from '../dto/llm-model-group.dto';

const OPENROUTER_MODELS: LlmModelGroupDto[] = [
  {
    label: 'openrouter',
    items: [
      {
        value: 'google/gemma-4-31b-it:free',
        label: 'Gemma 4 31b IT',
      },
      {
        value: 'google/gemma-4-26b-a4b-it:free',
        label: 'Gemma 4 26b A4B IT',
      },
      {
        value: 'nvidia/nemotron-3-super-120b-a12b:free',
        label: ' Nemotron 3 Super 120b A12B(NVIDIA)',
      },
      {
        value: 'moonshotai/kimi-k2.6:free',
        label: 'Kimi K2.6(Moonshot AI)',
      },
      {
        value: 'z-ai/glm-4.5-air:free',
        label: 'GLM 4.5 Air(Z.AI)',
      },
      {
        value: 'poolside/laguna-xs.2:free',
        label: 'Lagauna XS.2(Poolside)',
      },
    ],
  },
]

const NVIDIA_MODELS: LlmModelGroupDto[] = [
  {
    label: 'nvidia',
    items: [
      {
        value: 'qwen/qwen3-next-80b-a3b-instruct',
        label: 'Qwen3 Next 80b A3B Instruct',
      },
      {
        value: 'openai/gpt-oss-20b',
        label: 'GPT OSS 20B',
      },
      {
        value: 'mistralai/mistral-medium-3.5-128b',
        label: 'Mistral Medium 3.5 128B',
      },
      {
        value: 'deepseek-ai/deepseek-v4-flash',
        label: 'DeepSeek V4 Flash',
      },
      {
        value: 'meta/llama-4-maverick-17b-128e-instruct',
        label: 'META Llama 4 Maverick 17B 128E Instruct',
      },
      {
        value: 'moonshotai/kimi-k2.6',
        label: 'Kimi K2.6',
      },
      {
        value: 'stepfun-ai/step-3.7-flash',
        label: 'Step 3.7 Flash',
      },
      {
        value: 'nvidia/nemotron-3-ultra-550b-a55b',
        label: 'Nemotron 3 Ultra 550b A55B',
      },
    ],
  },
]





export const LLM_STATIC_MODEL_GROUPS: LlmModelGroupDto[] = [
  ...OPENROUTER_MODELS,
  ...NVIDIA_MODELS,

];
