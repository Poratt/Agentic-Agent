import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../../core/enums/user-role.enum';

@Entity('users')
export class User {
  @ApiProperty({ description: 'Unique identifier of the user', example: 1 })
  @PrimaryGeneratedColumn()
  id!: number;

  @ApiProperty({ description: 'User email address', example: 'user@example.com' })
  @Column({ unique: true })
  email!: string;

  @ApiProperty({ description: 'Full name of the user', example: 'John Doe' })
  @Column()
  fullName!: string;

  @ApiProperty({ description: 'Hashed user password', example: 'hashed_password_123', writeOnly: true })
  @Column()
  password!: string;

  @ApiProperty({ description: 'JWT refresh token for session management', example: 'ref_token_abc123', nullable: true })
  @Column({ nullable: true })
  refreshToken!: string | null;

  @ApiProperty({
    description: 'User role within the system',
    enum: UserRole,
    example: UserRole.User,
  })
  @Column({ type: 'enum', enum: UserRole, default: UserRole.User })
  role!: UserRole;

  @ApiProperty({ description: 'Timestamp when the user was created', example: '2026-05-12T10:00:00Z' })
  @CreateDateColumn()
  createdAt!: Date;

  @ApiProperty({ description: 'Timestamp when the user was last updated', example: '2026-05-12T11:00:00Z' })
  @UpdateDateColumn()
  updatedAt!: Date;

  @ApiProperty({ description: 'Timestamp of the user\'s last successful login', example: '2026-05-20T10:00:00Z', nullable: true })
  @Column({ nullable: true })
  lastLoginAt!: Date | null;


}