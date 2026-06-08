import { ApiProperty } from '@nestjs/swagger';
import { LlmModelOptionDto } from './llm-model-option.dto';

export class LlmModelGroupDto {
  @ApiProperty({ description: 'LLM provider label.', example: 'openrouter' })
  label!: 'openrouter' | 'nvidia' | 'ollama' | 'ollama-cloud';

  @ApiProperty({ description: 'Model options for this provider.', type: [LlmModelOptionDto] })
  items!: LlmModelOptionDto[];
}
