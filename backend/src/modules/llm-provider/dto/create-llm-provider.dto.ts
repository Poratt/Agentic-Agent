import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';
import { IsSafeBaseUrl } from './validate-base-url.validator';

export class CreateLlmProviderDto {
  @ApiProperty({ description: 'Unique identifier key for the provider', example: 'openai' })
  @IsString()
  @IsNotEmpty()
  key!: string;

  @ApiProperty({ description: 'Display label of the provider', example: 'OpenAI' })
  @IsString()
  @IsNotEmpty()
  label!: string;

  @ApiProperty({
    description: 'API base URL for LLM requests. Must be https. Private/internal addresses (127.x, 10.x, 172.16-31.x, 192.168.x, 169.254.x, localhost) are not allowed.',
    example: 'https://api.openai.com/v1',
  })
  @IsSafeBaseUrl()
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