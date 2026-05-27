import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	CreateDateColumn,
	UpdateDateColumn,
	OneToMany,
	Index,
} from 'typeorm';
import { ChatMessage } from './chat-message.entity';

@Entity('chat_sessions')
@Index(['userId'])
export class ChatSession {
	@PrimaryGeneratedColumn()
	id!: number;

	@Column()
	userId!: number;

	@Column({ type: 'varchar', length: 255, default: 'שיחה חדשה...' })
	title!: string;

	@OneToMany(() => ChatMessage, (message) => message.session)
	messages!: ChatMessage[];

	@CreateDateColumn()
	createdAt!: Date;

	@UpdateDateColumn()
	updatedAt!: Date;
}