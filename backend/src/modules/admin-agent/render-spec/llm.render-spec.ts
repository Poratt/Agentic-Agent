import { z } from 'zod';
import { RenderSpecType } from './render-spec.interface';

const LlmTestResultsRenderDataSchema = z.object({
  results: z.array(z.object({
    model: z.string().optional(),
    provider: z.string().optional(),
    status: z.string().optional(),
    latencyMs: z.number().optional(),
  })).optional(),
  summary: z.object({
    total: z.number().optional(),
    active: z.number().optional(),
    failed: z.number().optional(),
  }).optional(),
});

export type LlmTestResultsRenderData = z.infer<typeof LlmTestResultsRenderDataSchema>;

export const LlmTestResultsRenderSpecSchema = z.object({
  type: z.literal(RenderSpecType.LlmTestResults),
  data: LlmTestResultsRenderDataSchema,
});
