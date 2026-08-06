import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

/**
 * Per-user Google Calendar OAuth state.
 *
 * - refreshToken: encrypted at rest (AES-256-GCM via EncryptionService). Never
 *   returned to the client — it is looked up server-side by userId only.
 * - state / stateExpiresAt: short-lived CSRF state for the OAuth flow. Bound to
 *   the userId that initiated /calendar/auth, validated in /calendar/callback,
 *   and cleared once the flow completes.
 */
@Entity('google_calendar_tokens')
export class GoogleCalendarTokenEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  userId!: number;

  @Column({ type: 'text', nullable: true })
  refreshToken!: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  state!: string | null;

  @Column({ type: 'datetime', nullable: true })
  stateExpiresAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
