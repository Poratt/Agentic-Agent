import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import type { LlmProviderKey } from '../../llm/types/llm.types';

const LLM_PROVIDER_OPTIONS: LlmProviderKey[] = ['openrouter', 'nvidia', 'ollama'];

export class AgentRequestDto {
  @ApiProperty({
    description: 'The user prompt that will be sent to the AI agent.',
    example: 'Write a short summary of the following text...',
  })
  @IsString()
  @IsNotEmpty()
  prompt!: string;

  @ApiPropertyOptional({
    description: 'The specific chat session ID associated with this message thread.',
    example: 42,
  })
  @IsNumber()
  @IsOptional()
  sessionId?: number;

  @ApiPropertyOptional({
    description: 'Optional LLM provider override for this request only.',
    enum: LLM_PROVIDER_OPTIONS,
    example: 'openrouter',
  })
  @IsOptional()
  @IsIn(LLM_PROVIDER_OPTIONS)
  provider?: LlmProviderKey;

  @ApiPropertyOptional({
    description: 'Optional LLM model override for this request only.',
    example: 'google/gemma-4-31b-it:free',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  model?: string;
}
