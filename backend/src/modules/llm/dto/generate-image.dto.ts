import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsNumber, IsIn } from 'class-validator';

export class GenerateImageDto {
  @ApiPropertyOptional({ description: 'DB model id of an Agnes image model. Resolved automatically when omitted.', example: 12 })
  @IsOptional()
  @IsNumber()
  modelId?: number;

  @ApiProperty({ description: 'Text prompt for the image generation.', example: 'a red apple on a wooden table' })
  @IsString()
  @IsNotEmpty()
  prompt!: string;

  @ApiPropertyOptional({ description: 'Image size. For agnes-image-2.1-flash prefer tier sizes like 1K/2K/4K.', example: '1024x768' })
  @IsString()
  @IsOptional()
  size?: string;

  @ApiPropertyOptional({ description: 'Aspect ratio for agnes-image-2.1-flash, e.g. 16:9.', example: '16:9' })
  @IsString()
  @IsOptional()
  ratio?: string;

  @ApiPropertyOptional({ description: 'Input image URL(s) or Base64 Data URI(s) for image-to-image / multi-image edits.' })
  @IsString()
  @IsOptional()
  image?: string | string[];

  @ApiPropertyOptional({ description: 'Return the image as Base64 JSON instead of a hosted URL.', default: false })
  @IsBoolean()
  @IsOptional()
  returnBase64?: boolean;

  @ApiPropertyOptional({ description: 'Explicit provider key override.', example: 'agnes-ai' })
  @IsString()
  @IsOptional()
  providerOverride?: string;
}
