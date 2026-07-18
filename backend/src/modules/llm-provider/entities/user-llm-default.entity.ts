import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { LlmModelEntity } from './llm-model.entity';

@Entity('user_llm_defaults')
@Index(['userId'], { unique: true })
export class UserLlmDefaultEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'user_id' })
  userId!: number;

  @Column({ name: 'model_id' })
  modelId!: number;

  @ManyToOne(() => LlmModelEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'model_id' })
  model!: LlmModelEntity;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
