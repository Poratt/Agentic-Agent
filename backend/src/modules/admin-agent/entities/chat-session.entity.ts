import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { ChatMessage } from './chat-message.entity';

@Entity('chat_sessions')
@Index(['userId'])
export class ChatSession {
  @ApiProperty({ description: 'Unique numeric chat session id.', example: 42 })
  @PrimaryGeneratedColumn()
  id!: number;

  @ApiProperty({
    description: 'Owner user id. Session queries are scoped to the authenticated user.',
    example: 1,
  })
  @Column()
  userId!: number;

  @ApiProperty({
    description: 'Human-readable session title. Defaults to "שיחה חדשה..." until updated from a prompt.',
    example: 'Monthly sales report',
  })
  @Column({ type: 'varchar', length: 255, default: 'שיחה חדשה...' })
  title!: string;

  @ApiProperty({
    description: 'Messages in this session. They are permanently deleted when the session is deleted.',
    type: () => [ChatMessage],
  })
  @OneToMany(() => ChatMessage, (message) => message.session)
  messages!: ChatMessage[];

  @ApiProperty({ description: 'Timestamp when the session was created.', example: '2026-05-12T10:00:00Z' })
  @CreateDateColumn()
  createdAt!: Date;

  @ApiProperty({ description: 'Timestamp when the session was last updated.', example: '2026-05-12T11:00:00Z' })
  @UpdateDateColumn()
  updatedAt!: Date;
}
