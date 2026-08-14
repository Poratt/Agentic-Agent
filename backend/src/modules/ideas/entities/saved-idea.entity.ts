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
import { SavedIdeaSession } from './saved-idea-session.entity';

/**
 * A SavedIdea is one business idea produced by a generation run, stored as an
 * immutable snapshot under a SavedIdeaSession.
 *
 * The arrays (risks/competitors/nextSteps/signalsReferenced) are stored as JSON.
 * `validationBreakdown` from the generation output is intentionally omitted — it
 * is not rendered anywhere in the UI, so persisting it would add a column with
 * no consumer. The numeric `validationScore` is what the UI displays.
 */
@Entity('saved_ideas')
@Index(['sessionId'])
export class SavedIdea {
  @ApiProperty({ description: 'Unique numeric saved-idea id.', example: 301 })
  @PrimaryGeneratedColumn()
  id!: number;

  @ApiProperty({
    description: 'Owner user id. Must match the parent session owner for authorization.',
    example: 1,
  })
  @Column()
  userId!: number;

  @ApiProperty({
    description: 'Parent saved-idea session id. Null is not allowed — every idea belongs to a session.',
    example: 12,
  })
  @Column()
  sessionId!: number;

  /**
   * Parent session. Deleting the session cascades and permanently deletes this
   * idea.
   */
  @ApiProperty({ description: 'Parent session. Cascade-deleted with the session.', type: () => SavedIdeaSession })
  @ManyToOne(() => SavedIdeaSession, (session) => session.ideas, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sessionId' })
  session!: SavedIdeaSession;

  @ApiProperty({ description: 'Idea headline/title.', example: 'AI invoice reconciliation for freelancers' })
  @Column({ type: 'text' })
  title!: string;

  @ApiProperty({ description: 'Short idea description / value proposition.', example: 'An agent that...' })
  @Column({ type: 'text' })
  description!: string;

  @ApiProperty({ description: 'Target market segment for the idea.', example: 'Freelancers and solo consultants' })
  @Column({ type: 'text' })
  targetMarket!: string;

  @ApiProperty({ description: 'Validation score from 1 to 10 (higher is better).', example: 8 })
  @Column({ type: 'int' })
  validationScore!: number;

  @ApiProperty({
    description: 'Validation breakdown by category. Stored as JSON. Null when the LLM did not return one.',
    nullable: true,
  })
  @Column({ type: 'simple-json', nullable: true })
  validationBreakdown!: { competition: number; signalFit: number; feasibility: number; marketSize: number; riskPenalty?: number } | null;

  @ApiProperty({
    description: 'Short Hebrew explanation of the validation score. Null when the model returned none.',
    example: 'חוזק השוק וחוסר מתחרים ישירים תומכים ברעיון.',
    nullable: true,
  })
  @Column({ type: 'text', nullable: true })
  validationReason!: string | null;

  @ApiProperty({ description: 'List of key risks for the idea. Stored as JSON. Null when empty.', nullable: true, type: [String] })
  @Column({ type: 'simple-json', nullable: true })
  risks!: string[] | null;

  @ApiProperty({ description: 'List of top competitors found. Stored as JSON. Null when empty.', nullable: true, type: [String] })
  @Column({ type: 'simple-json', nullable: true })
  competitors!: string[] | null;

  @ApiProperty({ description: 'List of recommended next steps. Stored as JSON. Null when empty.', nullable: true, type: [String] })
  @Column({ type: 'simple-json', nullable: true })
  nextSteps!: string[] | null;

  @ApiProperty({ description: 'List of market signals the idea was grounded in. Stored as JSON. Null when empty.', nullable: true, type: [String] })
  @Column({ type: 'simple-json', nullable: true })
  signalsReferenced!: string[] | null;

  @ApiProperty({
    description: 'Suggested tech stack for a fast solo-dev MVP. Null for ideas generated before this field existed.',
    example: 'Whisper API + Next.js + Stripe',
    nullable: true,
  })
  @Column({ type: 'text', nullable: true })
  techStackSuggestion!: string | null;

  @ApiProperty({
    description: 'First concrete zero-budget distribution step. Null for ideas generated before this field existed.',
    example: 'פוסט השקה בקהילת r/podcasting',
    nullable: true,
  })
  @Column({ type: 'text', nullable: true })
  firstDistributionStep!: string | null;

  @ApiProperty({
    description: 'Estimated days to MVP for a solo developer. Null for ideas generated before this field existed.',
    example: 21,
    nullable: true,
  })
  @Column({ type: 'int', nullable: true })
  estimatedMvpDays!: number | null;

  @ApiProperty({
    description: 'True when the idea was generated from real market signals rather than fallback mode.',
    example: true,
  })
  @Column({ type: 'boolean', default: false })
  groundedInSignals!: boolean;

  @ApiProperty({
    description: 'True when the user marked this idea as a favorite from the ideas history.',
    example: false,
  })
  @Column({ type: 'boolean', default: false })
  isFavorite!: boolean;

  @ApiProperty({ description: 'Timestamp when the idea was saved.', example: '2026-08-11T04:00:01Z' })
  @CreateDateColumn()
  createdAt!: Date;
}
