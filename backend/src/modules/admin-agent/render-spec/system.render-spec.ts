import { z } from 'zod';
import { RenderSpecType } from './render-spec.interface';

const SystemStatusRenderDataSchema = z.object({
  totalUsers: z.number().optional(),
  activeSessions: z.number().optional(),
  swaggerStatus: z.string().optional(),
  uptime: z.number().optional(),
  nodeVersion: z.string().optional(),
});

export type SystemStatusRenderData = z.infer<typeof SystemStatusRenderDataSchema>;

export const SystemStatusRenderSpecSchema = z.object({
  type: z.literal(RenderSpecType.SystemStatus),
  data: SystemStatusRenderDataSchema,
});
