import { ApiProperty } from '@nestjs/swagger';

export class SessionResponseDto {
  @ApiProperty({ description: 'Unique numeric chat session id.', example: 42 })
  id!: number;

  @ApiProperty({
    description: 'Owner user id. Session endpoints only return sessions owned by the authenticated user.',
    example: 1,
  })
  userId!: number;

  @ApiProperty({
    description: 'Human-readable session title. Initially defaults to "שיחה חדשה..." and may be updated from the prompt.',
    example: 'Monthly sales report',
  })
  title!: string;

  @ApiProperty({ description: 'Timestamp when the session was created.', example: '2026-05-12T10:00:00Z' })
  createdAt!: Date;

  @ApiProperty({ description: 'Timestamp when the session or one of its messages was last updated.', example: '2026-05-12T11:00:00Z' })
  updatedAt!: Date;
}
