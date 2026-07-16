import { z } from 'zod';
import { RenderSpecType } from './render-spec.interface';

const ChatSessionsRenderDataSchema = z.object({
  sessions: z.array(z.object({
    id: z.number().optional(),
    title: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
  })).optional(),
});

export type ChatSessionsRenderData = z.infer<typeof ChatSessionsRenderDataSchema>;

const TranscriptRenderDataSchema = z.object({
  sessionId: z.number().optional(),
  messages: z.array(z.object({
    role: z.string().optional(),
    content: z.string().optional(),
    createdAt: z.string().optional(),
  })).optional(),
});

export type TranscriptRenderData = z.infer<typeof TranscriptRenderDataSchema>;

const SessionCreatedRenderDataSchema = z.object({
  id: z.number().optional(),
  title: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type SessionCreatedRenderData = z.infer<typeof SessionCreatedRenderDataSchema>;

export const ChatSessionsRenderSpecSchema = z.object({
  type: z.literal(RenderSpecType.ChatSessions),
  data: ChatSessionsRenderDataSchema,
});

export const TranscriptRenderSpecSchema = z.object({
  type: z.literal(RenderSpecType.Transcript),
  data: TranscriptRenderDataSchema,
});

export const SessionCreatedRenderSpecSchema = z.object({
  type: z.literal(RenderSpecType.SessionCreated),
  data: SessionCreatedRenderDataSchema,
});
