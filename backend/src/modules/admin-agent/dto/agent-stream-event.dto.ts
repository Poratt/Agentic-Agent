import { ApiProperty } from '@nestjs/swagger';

export class AgentStreamEventDto {
  @ApiProperty({
    description: 'Stream event kind. "token" carries model text; "step" carries tool progress metadata.',
    enum: ['token', 'step'],
    example: 'token',
  })
  type!: 'token' | 'step';

  @ApiProperty({
    description: 'Model text chunk. Present on token events.',
    example: 'The current user list contains...',
    required: false,
  })
  content?: string;

  @ApiProperty({
    description: 'Progress message for a tool step. Present on step events.',
    example: 'Fetching users...',
    required: false,
  })
  message?: string;

  @ApiProperty({
    description: 'UI icon key for a step event. Present on step events.',
    example: 'ph-check-circle',
    required: false,
  })
  icon?: string;
}
