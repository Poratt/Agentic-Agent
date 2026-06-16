import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { LlmModelEntity } from './llm-model.entity';

@Entity('llm_model_test_results')
export class LlmModelTestResultEntity {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ name: 'model_id' })
    modelId!: number;

    @ManyToOne(() => LlmModelEntity, (model) => model.testResults, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'model_id' })
    model!: LlmModelEntity;

    @Column({ type: 'int', comment: 'Response time in milliseconds' })
    responseTimeMs!: number;

    @Column({ type: 'enum', enum: ['success', 'error', 'timeout'] })
    status!: 'success' | 'error' | 'timeout';

    @Column({ type: 'text', nullable: true })
    errorMessage!: string | null;

    @CreateDateColumn()
    createdAt!: Date;
}