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
  responseTimeMs?: number;
  /** In-memory data URL of the image being composed before send. Not persisted. */
  imagePreview?: string;
  /** Base64 data URL of an image persisted in the backend. Returned from the API on session load. */
  imageUrl?: string;
}

export type ChatStreamEvent =
  | ({ type: 'step' } & IChatStep)
  | { type: 'token'; content?: string }
  | { type: 'confirmation'; actionId: string; action: string; target: string; metadata?: Record<string, any>; message?: string };

export interface ChatModelSelection {
  // provider: 'openrouter' | 'nvidia' | 'ollama';
  provider: string;
  model: string;
}
