import { z } from 'zod';
import { RenderSpecType } from './render-spec.interface';

const DeleteConfirmRenderDataSchema = z.object({
  id: z.number().optional(),
  entityType: z.string().optional(),
  name: z.string().optional(),
  deleted: z.boolean().optional(),
});

export type DeleteConfirmRenderData = z.infer<typeof DeleteConfirmRenderDataSchema>;

const RegisterFormRenderDataSchema = z.object({
  fullName: z.string().optional(),
  email: z.string().optional(),
  password: z.string().optional(),
});

export type RegisterFormRenderData = z.infer<typeof RegisterFormRenderDataSchema>;

export const DeleteConfirmRenderSpecSchema = z.object({
  type: z.literal(RenderSpecType.DeleteConfirm),
  data: DeleteConfirmRenderDataSchema,
});

export const RegisterFormRenderSpecSchema = z.object({
  type: z.literal(RenderSpecType.RegisterForm),
  data: RegisterFormRenderDataSchema,
});
