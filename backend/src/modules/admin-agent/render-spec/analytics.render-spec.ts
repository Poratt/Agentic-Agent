import { z } from 'zod';
import { RenderSpecType } from './render-spec.interface';

const AnalyticsChartRenderDataSchema = z.object({
  chartType: z.number().optional(),
  title: z.string().optional(),
  summary: z.string().optional(),
  maxValue: z.number().optional(),
  series: z.array(z.object({
    label: z.string().optional(),
    value: z.number().optional(),
  })).optional(),
});

export type AnalyticsChartRenderData = z.infer<typeof AnalyticsChartRenderDataSchema>;

export const AnalyticsChartRenderSpecSchema = z.object({
  type: z.literal(RenderSpecType.AnalyticsChart),
  data: AnalyticsChartRenderDataSchema,
});
