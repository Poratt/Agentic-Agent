import { z } from 'zod';
import { RenderSpecType } from './render-spec.interface';

const AgnesImageRenderDataSchema = z
  .object({
    url: z.string().optional(),
    b64Json: z.string().optional(),
    mimeType: z.string().optional(),
    size: z.string().optional(),
    model: z.string().optional(),
  })
  .refine((d) => Boolean(d.url || d.b64Json), {
    message: 'AgnesImage render requires url or b64Json',
  });

export type AgnesImageRenderData = z.infer<typeof AgnesImageRenderDataSchema>;

export const AgnesImageRenderSpecSchema = z.object({
  type: z.literal(RenderSpecType.AgnesImage),
  data: AgnesImageRenderDataSchema,
});
