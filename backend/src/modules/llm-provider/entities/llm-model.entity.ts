import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { LlmProviderEntity } from './llm-provider.entity';
import { LlmModelTestResultEntity } from './llm-model-test-results.entity';

@Entity('llm_models')
export class LlmModelEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  key!: string;

  @Column()
  label!: string;

  @Column({ default: true })
  active!: boolean;

  @Column({ default: 0 })
  sortOrder!: number;

  @Column({ name: 'provider_id' })
  providerId!: number;

  @ManyToOne(() => LlmProviderEntity, (provider) => provider.models, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'provider_id' })
  provider!: LlmProviderEntity;

  @OneToMany(() => LlmModelTestResultEntity, (testResult) => testResult.model, { cascade: true })
  testResults!: LlmModelTestResultEntity[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}