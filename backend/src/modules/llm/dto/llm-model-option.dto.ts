import { ApiProperty } from '@nestjs/swagger';

export class LlmModelOptionDto {
  @ApiProperty({ description: 'Model value sent to the LLM provider.', example: 'google/gemma-4-31b-it:free' })
  value!: string;

  @ApiProperty({ description: 'Human-readable model label for client display.', example: 'gemma-4-31b-it' })
  label!: string;
}
