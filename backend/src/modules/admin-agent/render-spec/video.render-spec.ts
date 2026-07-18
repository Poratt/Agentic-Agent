import { z } from 'zod';
import { RenderSpecType } from './render-spec.interface';

const AgnesVideoRenderDataSchema = z
  .object({
    url: z.string().optional(),
    status: z.string().optional(),
    seconds: z.union([z.number(), z.string()]).optional(),
    model: z.string().optional(),
  })
  .refine((d) => Boolean(d.url), {
    message: 'AgnesVideo render requires a completed video url',
  });

export type AgnesVideoRenderData = z.infer<typeof AgnesVideoRenderDataSchema>;

export const AgnesVideoRenderSpecSchema = z.object({
  type: z.literal(RenderSpecType.AgnesVideo),
  data: AgnesVideoRenderDataSchema,
});
