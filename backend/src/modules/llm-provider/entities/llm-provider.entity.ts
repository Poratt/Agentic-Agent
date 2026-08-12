import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, ValueTransformer } from 'typeorm';
import { LlmModelEntity } from './llm-model.entity';
import { encryptValue, decryptValue, isEncryptedValue } from '../../../core/services/encryption.service';

/**
 * TypeORM transformer for transparent API key encryption.
 * Uses standalone functions (no DI) — single source of truth for crypto logic.
 */
const apiKeyTransformer: ValueTransformer = {
  to(plaintext: string | null): string | null {
    // Treat empty string as "no change" — return undefined so TypeORM's
    // `update()` leaves the existing column value untouched. This prevents a
    // PATCH with apiKey: '' (e.g. from a form that didn't change the field)
    // from accidentally NULL-ing out a previously stored key.
    if (plaintext === '' || plaintext === undefined) return undefined as unknown as string;
    if (plaintext === null) return null;
    if (isEncryptedValue(plaintext)) return plaintext;
    return encryptValue(plaintext);
  },
  from(encrypted: string | null): string | null {
    if (!encrypted) return null;
    if (!isEncryptedValue(encrypted)) return encrypted;
    return decryptValue(encrypted);
  },
};

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

  @Column({
    type: 'text',
    nullable: true,
    select: false,
    transformer: apiKeyTransformer,
  })
  apiKey!: string | null;

  @Column({ default: true })
  active!: boolean;

  @OneToMany(() => LlmModelEntity, (model) => model.provider, { cascade: true })
  models!: LlmModelEntity[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}