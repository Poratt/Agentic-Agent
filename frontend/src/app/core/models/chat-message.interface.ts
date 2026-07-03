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
  /** Optional in-memory data URL of the image attached to this user turn. Not persisted to the backend; exists only while the message is in the active session view. */
  imagePreview?: string;
}

export type ChatStreamEvent =
  | ({ type: 'step' } & IChatStep)
  | { type: 'token'; content?: string };

export interface ChatModelSelection {
  // provider: 'openrouter' | 'nvidia' | 'ollama';
  provider: string;
  model: string;
}
