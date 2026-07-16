import { z } from 'zod';
import { RenderSpecType } from './render-spec.interface';

const DatabaseStorageRenderDataSchema = z.object({
  databaseName: z.string().optional(),
  tableCount: z.number().optional(),
  totalRows: z.number().optional(),
  totalSizeFormatted: z.string().optional(),
  tables: z.array(z.object({
    tableName: z.string().optional(),
    rowCount: z.number().optional(),
    dataSizeFormatted: z.string().optional(),
    indexSizeFormatted: z.string().optional(),
    totalSizeFormatted: z.string().optional(),
    percentOfDatabase: z.number().optional(),
    totalSizeBytes: z.number().optional(),
  })).optional(),
});

export type DatabaseStorageRenderData = z.infer<typeof DatabaseStorageRenderDataSchema>;

export const DatabaseStorageRenderSpecSchema = z.object({
  type: z.literal(RenderSpecType.DatabaseStorage),
  data: DatabaseStorageRenderDataSchema,
});
