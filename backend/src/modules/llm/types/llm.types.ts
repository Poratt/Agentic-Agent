export type LlmProvider = 'openrouter' | 'nvidia' | 'ollama' | 'ollama-cloud';

export type LlmToolSchema = {
  type: 'function';
  function?: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
};

export type LlmToolCall = {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
};

export type LlmResponse = {
  content: string | null;
  toolCalls?: LlmToolCall[];
};

export type LlmMessage =
  | { role: 'user'; content: string }
  | { role: 'assistant'; content: string | null; tool_calls?: LlmToolCall[] }
  | { role: 'tool'; tool_call_id: string; content: string };

export interface LlmRequest {
  prompt: string;
  systemContext?: string;
  tools?: LlmToolSchema[];
  messageHistory?: LlmMessage[];
  providerOverride?: LlmProvider;
  modelOverride?: string;
}

export type LlmRuntimeSelection = {
  provider: LlmProvider;
  model: string;
};

export type LlmModelCheckTarget = {
  provider: LlmProvider;
  name: string;
  active: boolean;
  sizeGb?: number;
  family?: string;
};

export type LlmModelTestResult = {
  name: string;
  provider: LlmProvider;
  available: boolean;
};
