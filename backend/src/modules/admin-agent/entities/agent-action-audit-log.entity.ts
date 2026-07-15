import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

export enum AuditAction {
  ACTION_CONFIRMED = 1,
  ACTION_CANCELLED = 2,
  ACTION_UNAUTHORIZED_ACCESS_ATTEMPT = 3,
  ACTION_EXPIRED = 4,
}

@Entity('agent_action_audit_log')
@Index(['userId', 'actionType'])
@Index(['createdAt'])
export class AgentActionAuditLog {
  @ApiProperty({ description: 'Unique numeric audit log id.', example: 5001 })
  @PrimaryGeneratedColumn()
  id!: number;

  @ApiProperty({ description: 'The user who performed or attempted the action.', example: 1 })
  @Column()
  userId!: number;

  @ApiProperty({ description: 'Numeric audit action type.', enum: AuditAction, example: AuditAction.ACTION_CONFIRMED })
  @Column({ type: 'enum', enum: AuditAction })
  actionType!: AuditAction;

  @ApiProperty({ description: 'Function name of the pending action.', example: 'UsersController_delete' })
  @Column({ type: 'varchar', length: 255 })
  functionName!: string;

  @ApiProperty({ description: 'Chat session id where the action was initiated.', example: 42 })
  @Column()
  sessionId!: number;

  @ApiProperty({ description: 'The pending action id (UUID).', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @Column({ type: 'varchar', length: 36 })
  actionId!: string;

  @ApiProperty({
    description: 'Extra context JSON. For unauthorized access attempts, includes the target userId.',
    nullable: true,
    example: { targetUserId: 2, requestedBy: 1 },
  })
  @Column({ type: 'json', nullable: true })
  metadata!: Record<string, any> | null;

  @ApiProperty({ description: 'Timestamp when the audit entry was created.', example: '2026-05-12T10:00:00Z' })
  @CreateDateColumn()
  createdAt!: Date;
}
