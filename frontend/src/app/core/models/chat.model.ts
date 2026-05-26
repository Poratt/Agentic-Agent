// import { colorTheme } from '../../components/agents/providers';

// export interface ToolEvent {
//   tool: string;
//   data?: any;
// }

// export interface SystemStatus {
//   totalUsers: number;
//   activeSessions: number;
//   isSwaggerUpToDate: boolean;
// }

// export interface ChatMessage {
//   text: string;
//   role: 'user' | 'assistant';
//   id?: number;
//   userId?: number;
//   createdAt?: Date;
//   toolEvent?: ToolEvent;
//   agentName?: string;
// }

// export interface Agent {
//   id?: number;
//   name: string;
//   role?: string;
//   persona: string;
//   provider: 'nvidia' | 'openrouter';
//   model: string;
//   active: boolean;
//   colorTheme?: colorTheme;
// }

// export interface AiAgentQueryRequest {
//   prompt: string;
// }

// export interface AiAgentQueryResponse {
//   message: string;
//   status?: SystemStatus;
// }

// export interface UserRoleLabels {
//   label?: string;
//   heLabel?: string;
// }

// export interface StreamToolEventPayload {
//   tools?: Array<{
//     tool?: string;
//     data?: unknown;
//   }>;
// }

// export interface EnrichedUser {
//   id: number;
//   email: string;
//   role: number;
//   createdAt: string;
//   updatedAt: string;
//   roleLabel?: string;
//   roleHeLabel?: string;
// }
