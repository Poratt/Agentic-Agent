import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Unique, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { LlmProvider } from './llm-provider.entity';

/**
 * Admin-managed LLM model row.
 *
 * Each model belongs to exactly one provider. Ollama models that are seen
 * on the live `/api/tags` endpoint but have no DB row are surfaced as
 * `runtimeDiscovered: true, installed: true` and are not persisted
 * automatically. Soft-disable only.
 */
@Entity('llm_models')
@Unique(['providerId', 'name'])
export class LlmModel {
  @ApiProperty({ description: 'Unique numeric model id.', example: 7 })
  @PrimaryGeneratedColumn()
  id!: number;

  @ApiProperty({ description: 'Owning provider id (FK to llm_providers.id).', example: 1 })
  @Column()
  providerId!: number;

  @ApiProperty({
    description: 'Owning provider. Backref only — providerId is the persisted FK column.',
    type: () => LlmProvider,
  })
  @ManyToOne(() => LlmProvider, (p) => p.models)
  @JoinColumn({ name: 'providerId' })
  provider!: LlmProvider;

  @ApiProperty({ description: 'Provider-specific model name used in API calls.', example: 'meta-llama/llama-3.1-70b-instruct' })
  @Column()
  name!: string;

  @ApiProperty({ description: 'User-facing display label.', example: 'Llama 3.1 70B Instruct' })
  @Column()
  label!: string;

  @ApiProperty({ description: 'Soft-disable flag. Inactive models are excluded from chat model options.', example: true })
  @Column({ default: true })
  active!: boolean;

  @ApiProperty({ description: 'Whether the model supports token streaming responses.', example: true })
  @Column({ default: true })
  supportsStreaming!: boolean;

  @ApiProperty({ description: 'Whether the model supports tool/function calling.', example: true })
  @Column({ default: false })
  supportsTools!: boolean;

  @ApiProperty({ description: 'Maximum context window in tokens, or null if unknown.', example: 131072, nullable: true })
  @Column({ nullable: true })
  contextWindow!: number | null;

  @ApiProperty({ description: 'Manual sort order inside the provider group. Lower = first.', example: 10 })
  @Column({ default: 0 })
  sortOrder!: number;

  @ApiProperty({
    description:
      'True if this model is auto-discovered at runtime (Ollama /api/tags) and not yet manually saved by an admin. ' +
      'Admin CRUD never creates runtime-only rows; saving a runtime model flips this to false.',
    example: false,
  })
  @Column({ default: false })
  runtimeDiscovered!: boolean;

  @ApiProperty({
    description: 'Last time this model was observed live. Used to detect drift between DB and runtime.',
    example: '2026-05-12T10:00:00Z',
    nullable: true,
  })
  @Column({ nullable: true })
  lastSeenAt!: Date | null;

  @ApiProperty({ description: 'Timestamp when the model record was created.', example: '2026-05-12T10:00:00Z' })
  @CreateDateColumn()
  createdAt!: Date;

  @ApiProperty({ description: 'Timestamp when the model record was last updated.', example: '2026-05-12T11:00:00Z' })
  @UpdateDateColumn()
  updatedAt!: Date;
}
