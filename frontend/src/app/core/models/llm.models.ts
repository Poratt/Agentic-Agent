export interface ProviderResponseDto {
  id: number;
  key: string;
  label: string;
  baseUrl: string;
  hasApiKey: boolean;
  defaultModelId?: number | null;
  active: boolean;
  modelsCount: number;
}

export interface CreateProviderDto {
  key: string;
  label: string;
  baseUrl: string;
  apiKey?: string;
  active?: boolean;
}

export interface UpdateProviderDto {
  label?: string;
  baseUrl?: string;
  apiKey?: string; // empty string means keep existing
  active?: boolean;
}

export interface ModelResponseDto {
  id: number;
  providerId: number;
  name: string;
  label: string;
  active: boolean;
  supportsStreaming: boolean;
  supportsTools: boolean;
  contextWindow?: number | null;
  sortOrder: number;
  runtimeDiscovered: boolean;
}

export interface CreateModelDto {
  name: string;
  label: string;
  active?: boolean;
  supportsStreaming?: boolean;
  supportsTools?: boolean;
  contextWindow?: number;
  sortOrder?: number;
}

export interface UpdateModelDto {
  label?: string;
  active?: boolean;
  supportsStreaming?: boolean;
  supportsTools?: boolean;
  contextWindow?: number;
  sortOrder?: number;
}

export interface StartTestRunDto {
  providerIds?: number[];
  modelIds?: number[];
  trigger?: 'manual' | 'cron';
}

export interface TestRunDto {
  id: number;
  startedAt: string;
  finishedAt?: string | null;
  trigger: 'manual' | 'cron';
  status: 'running' | 'completed' | 'failed';
  totalModels: number;
  testedModels: number;
  failedModels: number;
  createdAt: string;
  updatedAt: string;
}

export interface TestResultDto {
  id: number;
  runId: number;
  providerId: number;
  modelId?: number | null;
  providerKey: string;
  modelName: string;
  modelLabel: string;
  available: boolean;
  success: boolean;
  errorMessage?: string | null;
  latencyMs?: number | null;
  timeToFirstTokenMs?: number | null;
  tokensPerSecond?: number | null;
  inputTokens?: number | null;
  outputTokens?: number | null;
  qualityScore?: number | null;
  qualityReason?: string | null;
  testedAt: string;
}

export interface ModelRankingDto {
  providerKey: string;
  modelName: string;
  overallScore: number;
  availabilityScore: number;
  latencyScore: number;
  speedScore: number;
  qualityScore: number;
  sampleSize: number;
  lastTestedAt: string;
}

export interface OllamaRuntimeModelDto {
  name: string;
  size: string;
  format: string;
  family: string;
  digest: string;
  model: string;
  installed: boolean;
  missing?: boolean;
}
