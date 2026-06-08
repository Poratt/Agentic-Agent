import { LlmModelGroupDto } from '../dto/llm-model-group.dto';

export const LLM_STATIC_MODEL_GROUPS: LlmModelGroupDto[] = [
  {
    label: 'openrouter',
    items: [
      {
        value: 'google/gemma-4-31b-it:free',
        label: 'gemma-4-31b-it',
      },
      {
        value: 'google/gemma-4-26b-a4b-it:free',
        label: 'gemma-4-26b-a4b-it',
      },
      {
        value: 'nvidia/nemotron-3-super-120b-a12b:free',
        label: 'nemotron-3-super-120b-a12b',
      },
      {
        value: 'moonshotai/kimi-k2.6:free',
        label: 'kimi-k2.6',
      },
      {
        value: 'qwen/qwen3-coder:free',
        label: 'qwen3-coder',
      },
      {
        value: 'qwen/qwen3-next-80b-a3b-instruct:free',
        label: 'qwen3-next-80b-a3b-instruct',
      },
      {
        value: 'meta-llama/llama-3.3-70b-instruct:free',
        label: 'llama-3.3-70b-instruct',
      },
      {
        value: 'deepseek/deepseek-v4-flash:free',
        label: 'deepseek-v4-flash',
      },
      {
        value: 'z-ai/glm-4.5-air:free',
        label: 'glm-4.5-air',
      },
      {
        value: 'minimax/minimax-m2.5:free',
        label: 'minimax-m2.5',
      },
      {
        value: 'poolside/laguna-xs.2:free',
        label: 'laguna-xs.2',
      },
    ],
  },
  {
    label: 'nvidia',
    items: [
      {
        value: 'qwen/qwen3-next-80b-a3b-instruct',
        label: 'qwen3-next-80b-a3b-instruct',
      },
      {
        value: 'openai/gpt-oss-20b',
        label: 'gpt-oss-20b',
      },
      {
        value: 'mistralai/mistral-medium-3.5-128b',
        label: 'mistral-medium-3.5-128b',
      },
      {
        value: 'deepseek-ai/deepseek-v4-flash',
        label: 'deepseek-v4-flash',
      },
      {
        value: 'meta/llama-4-maverick-17b-128e-instruct',
        label: 'llama-4-maverick-17b-128e-instruct',
      },
      {
        value: 'moonshotai/kimi-k2.6',
        label: 'kimi-k2.6',
      },
      {
        value: 'stepfun-ai/step-3.7-flash',
        label: 'step-3.7-flash',
      },
      {
        value: 'nvidia/nemotron-3-ultra-550b-a55b',
        label: 'nemotron-3-ultra-550b-a55b',
      },
    ],
  },
];
