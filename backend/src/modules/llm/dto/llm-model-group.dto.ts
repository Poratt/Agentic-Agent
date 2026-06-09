import { ApiProperty } from '@nestjs/swagger';
import { LlmModelOptionDto } from './llm-model-option.dto';
import { LlmProvider } from '../types/llm.types';

export class LlmModelGroupDto {

  @ApiProperty({ description: 'LLM provider label.', example: 'openrouter' })
  label!: LlmProvider;

  @ApiProperty({ description: 'Model options for this provider.', type: [LlmModelOptionDto] })
  items!: LlmModelOptionDto[];
}

