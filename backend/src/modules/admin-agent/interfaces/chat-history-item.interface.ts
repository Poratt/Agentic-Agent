export interface IChatHistoryItem {
  role: 'user' | 'assistant';
  content: string;
}