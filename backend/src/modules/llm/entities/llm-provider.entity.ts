import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import { LlmModel } from './llm-model.entity';

/**
 * Admin-managed LLM provider.
 *
 * Holds the routing key, base URL, and an encrypted API key. Per-provider
 * default model is selected via `defaultModelId`. Soft-disable only —
 * DELETE endpoints flip `active` to false and never hard-delete.
 */
@Entity('llm_providers')
export class LlmProvider {
  @ApiProperty({ description: 'Unique numeric provider id.', example: 1 })
  @PrimaryGeneratedColumn()
  id!: number;

  @ApiProperty({
    description:
      'Routing key. Must match a value from `ProviderType` enum (openrouter | nvidia | ollama | ollama-cloud). ' +
      'The value "ollama-cloud" is rejected by admin CRUD endpoints because it is auto-computed at read-time.',
    example: 'openrouter',
  })
  @Column({ unique: true })
  key!: string;

  @ApiProperty({ description: 'User-facing display label.', example: 'OpenRouter' })
  @Column()
  label!: string;

  @ApiProperty({ description: 'Base URL used by the LLM client.', example: 'https://openrouter.ai/api/v1' })
  @Column()
  baseUrl!: string;

  @ApiHideProperty()
  @ApiProperty({
    description: 'AES-256-GCM encrypted API key. Hidden from default SELECTs; never returned by API responses.',
    example: null,
    nullable: true,
  })
  @Column({ nullable: true, select: false })
  apiKeyEncrypted!: string | null;

  @ApiProperty({
    description: 'Id of the LlmModel used as the default for this provider, or null if none is selected yet.',
    example: 7,
    nullable: true,
  })
  @Column({ nullable: true })
  defaultModelId!: number | null;

  @ApiProperty({ description: 'Soft-disable flag. Inactive providers are excluded from chat resolution.', example: true })
  @Column({ default: true })
  active!: boolean;

  @ApiProperty({
    description:
      'Marks the provider as having a paid/rate-limited plan. Cron evaluator auto-escalates cadence to 12h for flagged providers.',
    example: false,
  })
  @Column({ default: false })
  rateLimitFlag!: boolean;

  @ApiProperty({
    description: 'Models that belong to this provider.',
    type: () => LlmModel,
    isArray: true,
  })
  @OneToMany(() => LlmModel, (m) => m.provider)
  models!: LlmModel[];

  @ApiProperty({ description: 'Timestamp when the provider record was created.', example: '2026-05-12T10:00:00Z' })
  @CreateDateColumn()
  createdAt!: Date;

  @ApiProperty({ description: 'Timestamp when the provider record was last updated.', example: '2026-05-12T11:00:00Z' })
  @UpdateDateColumn()
  updatedAt!: Date;
}
