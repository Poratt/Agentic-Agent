import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('chat_messages')
@Index(['userId', 'createdAt'])
export class ChatMessage {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  userId!: number;

  @Column({ type: 'enum', enum: ['user', 'assistant', 'tool'] })
  role!: 'user' | 'assistant' | 'tool';

  @Column({ type: 'text' })
  content!: string;

  @Column({ type: 'varchar', length: 255, nullable: true, default: null })
  toolCallId!: string | null;

  @CreateDateColumn()
  createdAt!: Date;
}