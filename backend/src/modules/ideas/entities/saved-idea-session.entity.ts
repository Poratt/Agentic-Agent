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
import { SavedIdea } from './saved-idea.entity';

/**
 * A SavedIdeaSession is one persisted run of the business-idea generator.
 *
 * Every generation (manual or nightly cron) is stored as a session so the user
 * can revisit past runs from the ideas history page. The session is owned by
 * the user who triggered it (or the admin user for nightly runs) and all of its
 * ideas are cascade-deleted when the session is deleted.
 */
@Entity('saved_idea_sessions')
@Index(['userId', 'createdAt'])
export class SavedIdeaSession {
  @ApiProperty({ description: 'Unique numeric saved-idea session id.', example: 12 })
  @PrimaryGeneratedColumn()
  id!: number;

  @ApiProperty({
    description: 'Owner user id. All session queries are scoped to the authenticated user.',
    example: 1,
  })
  @Column()
  userId!: number;

  @ApiProperty({
    description: 'Business domain the ideas were generated for (used as the search scope).',
    example: 'AI-powered productivity tools for freelancers',
  })
  @Column({ type: 'varchar', length: 500 })
  domain!: string;

  @ApiProperty({
    description: 'LLM provider key used for the generation (e.g. openrouter, agnes-ai). Null for legacy/unspecified runs.',
    example: 'openrouter',
    nullable: true,
  })
  @Column({ type: 'varchar', length: 100, nullable: true })
  provider!: string | null;

  @ApiProperty({
    description: 'LLM model key used for the generation. Null for legacy/unspecified runs.',
    example: 'openai/gpt-4o',
    nullable: true,
  })
  @Column({ type: 'varchar', length: 100, nullable: true })
  model!: string | null;

  @ApiProperty({
    description: 'True when this session was produced by the nightly cron job rather than a manual run.',
    example: false,
  })
  @Column({ type: 'boolean', default: false })
  nightly!: boolean;

  @ApiProperty({
    description: 'True until the owning user has viewed this nightly session in the ideas history. Drives the "new ideas" banner.',
    example: false,
  })
  @Column({ type: 'boolean', default: false })
  unread!: boolean;

  @ApiProperty({ description: 'Timestamp when the session was created.', example: '2026-08-11T04:00:00Z' })
  @CreateDateColumn()
  createdAt!: Date;

  @ApiProperty({ description: 'Timestamp when the session was last updated.', example: '2026-08-11T04:00:00Z' })
  @UpdateDateColumn()
  updatedAt!: Date;

  /**
   * Ideas generated in this session. Deleting the session cascades and
   * permanently deletes all of its ideas.
   */
  @ApiProperty({ description: 'Ideas generated in this session. Cascade-deleted with the session.', type: () => [SavedIdea] })
  @OneToMany(() => SavedIdea, (idea) => idea.session, { onDelete: 'CASCADE' })
  ideas!: SavedIdea[];
}
