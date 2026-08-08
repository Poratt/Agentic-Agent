import { z } from 'zod';
import { RenderSpecType } from './render-spec.interface';

const AuthUrlRenderDataSchema = z.object({
  url: z.string().url(),
  title: z.string().optional(),
});

export type AuthUrlRenderData = z.infer<typeof AuthUrlRenderDataSchema>;

export const AuthUrlRenderSpecSchema = z.object({
  type: z.literal(RenderSpecType.AuthUrl),
  data: AuthUrlRenderDataSchema,
});
