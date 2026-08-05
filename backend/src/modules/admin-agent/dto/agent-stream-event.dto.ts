import { ApiProperty } from '@nestjs/swagger';

export class AgentStreamEventDto {
  @ApiProperty({
    description: 'Stream event kind. "token" carries model text; "step" carries tool progress; "confirmation" carries a pending destructive action awaiting user approval; "render" carries a rich component payload.',
    enum: ['token', 'step', 'confirmation', 'render'],
    example: 'token',
  })
  type!: 'token' | 'step' | 'confirmation' | 'render';

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

  @ApiProperty({
    description: 'Pending destructive action id. Present on confirmation events.',
    required: false,
  })
  actionId?: string;

  @ApiProperty({
    description: 'Destructive action name. Present on confirmation events.',
    required: false,
  })
  action?: string;

  @ApiProperty({
    description: 'Destructive action target. Present on confirmation events.',
    required: false,
  })
  target?: string;

  @ApiProperty({
    description: 'Component key for a rich render block. Present on render events.',
    required: false,
  })
  component?: string;

  @ApiProperty({
    description: 'Payload data for a rich render block. Present on render events.',
    required: false,
  })
  data?: Record<string, unknown>;
}
