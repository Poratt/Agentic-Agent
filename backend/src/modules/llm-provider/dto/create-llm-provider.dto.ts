import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsUrl, IsOptional, IsBoolean } from 'class-validator';

export class CreateLlmProviderDto {
  @ApiProperty({ description: 'Unique identifier key for the provider', example: 'openai' })
  @IsString()
  @IsNotEmpty()
  key!: string;

  @ApiProperty({ description: 'Display label of the provider', example: 'OpenAI' })
  @IsString()
  @IsNotEmpty()
  label!: string;

  @ApiProperty({ description: 'API base URL for LLM requests', example: 'https://api.openai.com/v1' })
  @IsUrl()
  @IsNotEmpty()
  baseUrl!: string;

  @ApiPropertyOptional({ description: 'Optional secret API key', example: 'sk-proj-exampleKey123' })
  @IsString()
  @IsOptional()
  apiKey?: string;

  @ApiPropertyOptional({ description: 'Status indicating if provider is active', default: true })
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}