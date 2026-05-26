export interface ServiceResultContainer<T> {
  success: boolean;
  message: string;
  result: T;
  error?: string[];
  retryAfter?: string;
  statusCode?: number;
}
