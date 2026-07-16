import { z } from 'zod';
import { RenderSpecType } from './render-spec.interface';

const CurrencyRenderDataSchema = z.object({
  sourceCurrency: z.string().optional(),
  targetCurrency: z.string().optional(),
  amount: z.number().optional(),
  convertedAmount: z.number().optional(),
  rate: z.number().optional(),
  lastUpdated: z.string().optional(),
  rates: z.record(z.string(), z.number()).optional(),
  mode: z.enum(['convert', 'rates']).optional(),
});

export type CurrencyRenderData = z.infer<typeof CurrencyRenderDataSchema>;

export const CurrencyRenderSpecSchema = z.object({
  type: z.literal(RenderSpecType.Currency),
  data: CurrencyRenderDataSchema,
});
