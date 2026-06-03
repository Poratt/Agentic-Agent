import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { ChatSession } from './chat-session.entity';

@Entity('chat_messages')
@Index(['sessionId', 'createdAt'])
export class ChatMessage {
  @ApiProperty({ description: 'Unique numeric chat message id.', example: 1001 })
  @PrimaryGeneratedColumn()
  id!: number;

  @ApiProperty({
    description: 'Owner user id. The parent session must belong to the same authenticated user.',
    example: 1,
  })
  @Column()
  userId!: number;

  @ApiProperty({
    description: 'Parent chat session id. Null is reserved for legacy or unassigned messages.',
    example: 42,
    nullable: true,
  })
  @Column({ nullable: true })
  sessionId!: number | null;

  @ApiProperty({
    description: 'Parent session. Deleting the session cascades and permanently deletes its messages.',
    type: () => ChatSession,
  })
  @ManyToOne(() => ChatSession, (session) => session.messages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sessionId' })
  session!: ChatSession;

  @ApiProperty({
    description: 'Message role. "user" is the prompt, "assistant" is model output, and "tool" is an internal tool result.',
    enum: ['user', 'assistant', 'tool'],
    example: 'assistant',
  })
  @Column({ type: 'enum', enum: ['user', 'assistant', 'tool'] })
  role!: 'user' | 'assistant' | 'tool';

  @ApiProperty({ description: 'Stored message body.', example: 'Here is the answer...' })
  @Column({ type: 'text' })
  content!: string;

  @ApiProperty({
    description: 'Tool call id for tool-result messages, or null for normal user/assistant messages.',
    example: 'call_abc123',
    nullable: true,
  })
  @Column({ type: 'varchar', length: 255, nullable: true, default: null })
  toolCallId!: string | null;

  @ApiProperty({ description: 'Timestamp when the message was created.', example: '2026-05-12T10:00:00Z' })
  @CreateDateColumn()
  createdAt!: Date;
}
