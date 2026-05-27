export interface IChatMessage {
  id?: number;
  role: 'user' | 'assistant';
  content: string;
  createdAt?: Date;
}