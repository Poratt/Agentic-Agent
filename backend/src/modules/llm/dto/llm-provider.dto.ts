import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateProviderDto {
  @ApiProperty({ example: 'openrouter', description: 'Unique provider key (e.g., openrouter, nvidia, ollama)' })
  @IsString()
  @IsNotEmpty()
  key: string;

  @ApiProperty({ example: 'OpenRouter', description: 'Human-readable provider label' })
  @IsString()
  @IsNotEmpty()
  label: string;

  @ApiPropertyOptional({ example: 'https://openrouter.ai/api/v1', description: 'Base URL for the provider API' })
  @IsOptional()
  @IsString()
  baseUrl?: string;

  @ApiPropertyOptional({ example: 'sk-or-xxxxx', description: 'API key for the provider (will be encrypted)' })
  @IsOptional()
  @IsString()
  apiKey?: string;

  @ApiPropertyOptional({ example: 1, description: 'Default model ID from the models table', default: null })
  @IsOptional()
  defaultModelId?: number;

  @ApiPropertyOptional({ example: true, description: 'Whether the provider is active', default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({ example: false, description: 'Whether the provider has rate limits', default: false })
  @IsOptional()
  @IsBoolean()
  rateLimitFlag?: boolean;
}

export class UpdateProviderDto {
  @ApiPropertyOptional({ example: 'OpenRouter Updated', description: 'Updated human-readable label' })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiPropertyOptional({ example: 'https://new-url.com/api', description: 'Updated base URL' })
  @IsOptional()
  @IsString()
  baseUrl?: string;

  @ApiPropertyOptional({ example: 'sk-or-newkey', description: 'Updated API key (will be encrypted)' })
  @IsOptional()
  @IsString()
  apiKey?: string;

  @ApiPropertyOptional({ example: 2, description: 'Updated default model ID' })
  @IsOptional()
  defaultModelId?: number;

  @ApiPropertyOptional({ example: false, description: 'Updated active status' })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({ example: true, description: 'Updated rate limit flag' })
  @IsOptional()
  @IsBoolean()
  rateLimitFlag?: boolean;
}

export class ProviderResponseDto {
  @ApiProperty({ description: 'Provider database ID' })
  id: number;

  @ApiProperty({ description: 'Provider key', example: 'openrouter' })
  key: string;

  @ApiProperty({ description: 'Provider label', example: 'OpenRouter' })
  label: string;

  @ApiProperty({ description: 'Provider base URL', example: 'https://openrouter.ai/api/v1' })
  baseUrl: string;

  @ApiProperty({ description: 'Whether the provider has an API key configured', example: true })
  hasApiKey: boolean;

  @ApiProperty({ description: 'Default model ID', example: 1, required: false })
  defaultModelId: number | null;

  @ApiProperty({ description: 'Whether the provider is active', example: true })
  active: boolean;

  @ApiProperty({ description: 'Count of models associated with this provider', example: 5 })
  modelsCount: number;
}

export class LlmProviderDto {
  @ApiProperty({ description: 'Provider identifier.', example: 'ollama' })
  id!: string;

  @ApiProperty({ description: 'Whether this provider is the active provider.', example: true })
  active!: boolean;

  @ApiProperty({ description: 'Whether the provider has the required local configuration.', example: true })
  configured!: boolean;

  @ApiProperty({ description: 'Whether the provider can currently be queried for local availability.', example: true })
  available!: boolean;

  @ApiProperty({ description: 'Configured model for this provider when available.', example: 'llama3', required: false })
  configuredModel?: string;

  @ApiProperty({
    description: 'Available model names reported by the provider when the provider supports local listing.',
    example: ['llama3', 'mistral'],
    required: false,
    type: [String],
  })
  models?: string[];
}
