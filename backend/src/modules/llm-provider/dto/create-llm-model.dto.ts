import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsBoolean, IsOptional, IsNumber } from 'class-validator';

export class CreateLlmModelDto {
  @ApiProperty({ description: 'Unique identifier key for the model', example: 'gpt-4o' })
  @IsString()
  @IsNotEmpty()
  key!: string;

  @ApiProperty({ description: 'Display name of the model', example: 'GPT-4o' })
  @IsString()
  @IsNotEmpty()
  label!: string;

  @ApiPropertyOptional({ description: 'Status indicating if the model is active', default: true })
  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @ApiPropertyOptional({ description: 'Sort hierarchy order', default: 0 })
  @IsNumber()
  @IsOptional()
  sortOrder?: number;

  @ApiPropertyOptional({ description: 'Mark this model as the default for this provider', default: false })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}