import { ProviderType } from "./provider-type.enum";

/**
 * Routing key for the LLM client.
 * Derived from `ProviderType` so the type and the enum can never drift.
 */
export type LlmProviderKey = `${ProviderType}`;

export type LlmToolSchema = {
  type: "function";
  function?: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
};

export type LlmToolCall = {
  id: string;
  type: "function";
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
  | { role: "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: LlmToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string };

export interface LlmRequest {
  prompt: string;
  systemContext?: string;
  tools?: LlmToolSchema[];
  messageHistory?: LlmMessage[];
  providerOverride?: LlmProviderKey;
  modelOverride?: string;
}

export type LlmRuntimeSelection = {
  provider: LlmProviderKey;
  model: string;
};

export type LlmModelCheckTarget = {
  provider: LlmProviderKey;
  name: string;
  active: boolean;
  sizeGb?: number;
  family?: string;
};

export type LlmModelTestResult = {
  name: string;
  provider: LlmProviderKey;
  available: boolean;
};

export type LlmProviderConfig = {
  id: LlmProviderKey;
  apiKey: string;
  baseUrl: string;
  model: string;
};
