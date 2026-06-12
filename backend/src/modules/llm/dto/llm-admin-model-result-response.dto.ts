import { ApiProperty } from '@nestjs/swagger';
import { ModelResponseDto } from './llm-model.dto';

export class LlmAdminModelResultResponseDto {
  @ApiProperty({ description: 'Whether the models request succeeded.', example: true })
  success!: boolean;

  @ApiProperty({ description: 'Human-readable result message.', example: 'LLM models retrieved successfully.' })
  message!: string;

  @ApiProperty({ description: 'Model metadata.', type: [ModelResponseDto], nullable: true })
  result!: ModelResponseDto[] | null;
}
