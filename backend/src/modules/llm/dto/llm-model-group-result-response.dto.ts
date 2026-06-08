import { ApiProperty } from '@nestjs/swagger';
import { LlmModelGroupDto } from './llm-model-group.dto';

export class LlmModelGroupResultResponseDto {
  @ApiProperty({ description: 'Whether the model options request succeeded.', example: true })
  success!: boolean;

  @ApiProperty({ description: 'Human-readable result message.', example: 'LLM model options retrieved successfully.' })
  message!: string;

  @ApiProperty({ description: 'Grouped model options for client selectors.', type: [LlmModelGroupDto], nullable: true })
  result!: LlmModelGroupDto[] | null;
}
