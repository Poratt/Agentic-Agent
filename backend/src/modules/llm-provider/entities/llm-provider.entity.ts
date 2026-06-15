import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { LlmModelEntity } from './llm-model.entity';

@Entity('llm_providers')
export class LlmProviderEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  key!: string;

  @Column()
  label!: string;

  @Column()
  baseUrl!: string;

  @Column({ nullable: true })
  apiKey!: string;

  @Column({ default: true })
  active!: boolean;

  @OneToMany(() => LlmModelEntity, (model) => model.provider, { cascade: true })
  models!: LlmModelEntity[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}