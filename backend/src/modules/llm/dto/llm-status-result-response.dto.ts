import { ApiProperty } from '@nestjs/swagger';
import { LlmStatusDto } from './llm-status.dto';

export class LlmStatusResultResponseDto {
  @ApiProperty({ description: 'Whether the status request succeeded.', example: true })
  success!: boolean;

  @ApiProperty({ description: 'Human-readable result message.', example: 'LLM status retrieved successfully.' })
  message!: string;

  @ApiProperty({ description: 'Safe LLM runtime status.', type: LlmStatusDto, nullable: true })
  result!: LlmStatusDto | null;
}
