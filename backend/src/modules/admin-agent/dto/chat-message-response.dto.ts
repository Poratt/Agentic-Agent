import { ApiProperty } from '@nestjs/swagger';

export class ChatMessageResponseDto {
  @ApiProperty({ description: 'Unique numeric chat message id.', example: 1001 })
  id!: number;

  @ApiProperty({
    description: 'Owner user id. Message endpoints only return messages from sessions owned by the authenticated user.',
    example: 1,
  })
  userId!: number;

  @ApiProperty({
    description: 'Parent chat session id. Messages are deleted when their session is deleted.',
    example: 42,
    nullable: true,
  })
  sessionId!: number | null;

  @ApiProperty({
    description: 'Message role. "user" is the prompt, "assistant" is model output, and "tool" is an internal tool result.',
    enum: ['user', 'assistant', 'tool'],
    example: 'assistant',
  })
  role!: 'user' | 'assistant' | 'tool';

  @ApiProperty({ description: 'Message body stored for the chat history.', example: 'Here is the answer...' })
  content!: string;

  @ApiProperty({
    description: 'Tool call id for internal tool-result messages, or null for normal user/assistant messages.',
    example: 'call_abc123',
    nullable: true,
  })
  toolCallId!: string | null;

  @ApiProperty({
    description: 'Optional Base64 data URL of an image attached to this user message.',
    nullable: true,
  })
  imageUrl!: string | null;

  @ApiProperty({ description: 'Timestamp when the message was created.', example: '2026-05-12T10:00:00Z' })
  createdAt!: Date;
}
