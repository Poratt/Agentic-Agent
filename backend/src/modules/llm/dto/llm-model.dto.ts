import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsNumber, IsString } from 'class-validator';

export class CreateModelDto {
  @ApiProperty({ example: 'gpt-4o', description: 'Unique model name/ID within the provider' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'GPT-4o', description: 'Human-readable label' })
  @IsString()
  @IsNotEmpty()
  label: string;

  @ApiPropertyOptional({ example: true, description: 'Whether the model is active', default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({ example: true, description: 'Whether the model supports streaming', default: true })
  @IsOptional()
  @IsBoolean()
  supportsStreaming?: boolean;

  @ApiPropertyOptional({ example: true, description: 'Whether the model supports tool use', default: false })
  @IsOptional()
  @IsBoolean()
  supportsTools?: boolean;

  @ApiPropertyOptional({ example: 128000, description: 'Context window size in tokens' })
  @IsOptional()
  @IsNumber()
  contextWindow?: number;

  @ApiPropertyOptional({ example: 0, description: 'Sort order for UI display', default: 0 })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

export class UpdateModelDto {
  @ApiPropertyOptional({ example: 'GPT-4o Updated', description: 'Updated human-readable label' })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiPropertyOptional({ example: false, description: 'Updated active status' })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({ example: false, description: 'Updated streaming support' })
  @IsOptional()
  @IsBoolean()
  supportsStreaming?: boolean;

  @ApiPropertyOptional({ example: true, description: 'Updated tools support' })
  @IsOptional()
  @IsBoolean()
  supportsTools?: boolean;

  @ApiPropertyOptional({ example: 64000, description: 'Updated context window' })
  @IsOptional()
  @IsNumber()
  contextWindow?: number;

  @ApiPropertyOptional({ example: 10, description: 'Updated sort order' })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

export class ModelResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  providerId: number;

  @ApiProperty()
  name: string;

  @ApiProperty()
  label: string;

  @ApiProperty()
  active: boolean;

  @ApiProperty()
  supportsStreaming: boolean;

  @ApiProperty()
  supportsTools: boolean;

  @ApiProperty()
  contextWindow: number | null;

  @ApiProperty()
  sortOrder: number;

  @ApiProperty({ description: 'Whether the model was discovered at runtime (e.g. Ollama)' })
  runtimeDiscovered: boolean;
}
