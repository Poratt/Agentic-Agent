import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString } from 'class-validator';
import type { LlmProvider } from '../../llm/types/llm.types';

const LLM_PROVIDER_OPTIONS: LlmProvider[] = ['openrouter', 'nvidia', 'ollama', 'ollama-cloud'];

export class AgentRequestDto {
  @ApiProperty({
    description: 'The user prompt that will be sent to the AI agent.',
    example: 'Write a short summary of the following text...',
  })
  @IsString()
  @IsOptional()
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
  @IsString()
  provider?: LlmProvider;

  @ApiPropertyOptional({
    description: 'Optional LLM model override for this request only.',
    example: 'google/gemma-4-31b-it:free',
  })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional({
    description:
      'Optional Base64 data URL of an image to attach to this turn. Format: data:image/<mime>;base64,<payload>. If present, the user message is sent to the LLM as a multimodal content array containing this image plus the prompt text. If absent, the user message is sent as plain text.',
    example: 'data:image/jpeg;base64,/9j/4AAQ...',
  })
  @IsOptional()
  @IsString()
  image?: string;
}
