import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { LlmModelTestResult } from './llm-model-test-result.entity';

/**
 * One full evaluation pass over the active model set.
 *
 * A run is started manually from Settings or by a scheduled cron job. The
 * `status` field flips to `completed` or `failed` once `executeRun` finishes.
 * `totalModels`, `testedModels`, and `failedModels` are kept current for
 * live progress rendering in the Settings UI.
 */
@Entity('llm_model_test_runs')
export class LlmModelTestRun {
  @ApiProperty({ description: 'Unique numeric run id.', example: 12 })
  @PrimaryGeneratedColumn()
  id!: number;

  @ApiProperty({ description: 'Timestamp when the run started.', example: '2026-05-12T10:00:00Z' })
  @Column()
  startedAt!: Date;

  @ApiProperty({ description: 'Timestamp when the run finished, or null while still running.', example: '2026-05-12T10:05:32Z', nullable: true })
  @Column({ nullable: true })
  finishedAt!: Date | null;

  @ApiProperty({
    description: 'How the run was triggered.',
    enum: ['manual', 'cron'],
    enumName: 'LlmTestRunTrigger',
    example: 'manual',
  })
  @Column({ type: 'enum', enum: ['manual', 'cron'] })
  trigger!: 'manual' | 'cron';

  @ApiProperty({
    description: 'Current run status. "running" rows are the live in-progress run; UI uses this to disable the start button.',
    enum: ['running', 'completed', 'failed'],
    enumName: 'LlmTestRunStatus',
    example: 'running',
  })
  @Column({ type: 'enum', enum: ['running', 'completed', 'failed'], default: 'running' })
  status!: 'running' | 'completed' | 'failed';

  @ApiProperty({ description: 'Number of models queued for this run.', example: 18 })
  @Column({ default: 0 })
  totalModels!: number;

  @ApiProperty({ description: 'Number of models that have completed testing in this run (success or fail).', example: 6 })
  @Column({ default: 0 })
  testedModels!: number;

  @ApiProperty({ description: 'Number of models that failed (unavailable, timeout, error) in this run.', example: 1 })
  @Column({ default: 0 })
  failedModels!: number;

  @ApiProperty({
    description: 'Per-model result rows. Backref only.',
    type: () => LlmModelTestResult,
    isArray: true,
  })
  @OneToMany(() => LlmModelTestResult, (r) => r.run)
  results!: LlmModelTestResult[];

  @ApiProperty({ description: 'Timestamp when the run record was created.', example: '2026-05-12T10:00:00Z' })
  @CreateDateColumn()
  createdAt!: Date;

  @ApiProperty({ description: 'Timestamp when the run record was last updated.', example: '2026-05-12T10:05:32Z' })
  @UpdateDateColumn()
  updatedAt!: Date;
}
