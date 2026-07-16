import { z } from 'zod';
import { RenderSpecType } from './render-spec.interface';

const UserProfileRenderDataSchema = z.object({
  sub: z.number().optional(),
  email: z.string().optional(),
  role: z.number().optional(),
  iat: z.number().optional(),
  exp: z.number().optional(),
});

export type UserProfileRenderData = z.infer<typeof UserProfileRenderDataSchema>;

const UsersTableRenderDataSchema = z.object({
  users: z.array(z.object({
    id: z.number().optional(),
    fullName: z.string().optional(),
    email: z.string().optional(),
    role: z.number().optional(),
    createdAt: z.string().optional(),
  })).optional(),
});

export type UsersTableRenderData = z.infer<typeof UsersTableRenderDataSchema>;

const RoleChangeRenderDataSchema = z.object({
  id: z.number().optional(),
  email: z.string().optional(),
  fullName: z.string().optional(),
  role: z.number().optional(),
  updatedAt: z.string().optional(),
});

export type RoleChangeRenderData = z.infer<typeof RoleChangeRenderDataSchema>;

export const UserProfileRenderSpecSchema = z.object({
  type: z.literal(RenderSpecType.UserProfile),
  data: UserProfileRenderDataSchema,
});

export const UsersTableRenderSpecSchema = z.object({
  type: z.literal(RenderSpecType.UsersTable),
  data: UsersTableRenderDataSchema,
});

export const RoleChangeRenderSpecSchema = z.object({
  type: z.literal(RenderSpecType.RoleChange),
  data: RoleChangeRenderDataSchema,
});
