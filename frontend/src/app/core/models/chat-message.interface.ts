export interface IChatStep {
  icon: string;
  message: string;
}

export interface IChatMessage {
  id?: number;
  sessionId?: number;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  createdAt?: Date;
  steps?: IChatStep[];
}

export type ChatStreamEvent =
  | ({ type: 'step' } & IChatStep)
  | { type: 'token'; content?: string };

export interface ChatModelSelection {
  // provider: 'openrouter' | 'nvidia' | 'ollama';
  provider: string;
  model: string;
}
