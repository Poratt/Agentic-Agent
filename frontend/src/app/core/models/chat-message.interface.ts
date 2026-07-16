export interface IChatStep {
  icon: string;
  message: string;
}

export interface IRenderBlock {
  component: string;
  data: Record<string, unknown>;
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
  /** JSON string of RenderSpec for persisted messages. */
  renderSpec?: string | null;
  /** In-memory render blocks accumulated during streaming. Not persisted directly. */
  renderBlocks?: IRenderBlock[];
}

export type ChatStreamEvent =
  | ({ type: 'step' } & IChatStep)
  | { type: 'token'; content?: string }
  | { type: 'render'; component: string; data: Record<string, unknown> }
  | { type: 'confirmation'; actionId: string; action: string; target: string; metadata?: Record<string, any>; message?: string };

export interface ChatModelSelection {
  // provider: 'openrouter' | 'nvidia' | 'ollama';
  provider: string;
  model: string;
}
