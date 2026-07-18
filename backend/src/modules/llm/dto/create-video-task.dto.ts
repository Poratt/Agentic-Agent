import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsIn } from 'class-validator';

export class CreateVideoTaskDto {
  @ApiPropertyOptional({ description: 'DB model id of an Agnes video model. Resolved automatically when omitted.', example: 14 })
  @IsOptional()
  @IsNumber()
  modelId?: number;

  @ApiProperty({ description: 'Text prompt describing the video to generate.', example: 'a calm ocean wave at sunset' })
  @IsString()
  @IsNotEmpty()
  prompt!: string;

  @ApiPropertyOptional({ description: 'Input image URL or Base64 Data URI for image-to-video.' })
  @IsString()
  @IsOptional()
  image?: string;

  @ApiPropertyOptional({ description: 'Generation mode: ti2vid (text/image to video) or keyframes.', enum: ['ti2vid', 'keyframes'], default: 'ti2vid' })
  @IsIn(['ti2vid', 'keyframes'])
  @IsOptional()
  mode?: 'ti2vid' | 'keyframes';

  @ApiPropertyOptional({ description: 'Output height in pixels.' })
  @IsNumber()
  @IsOptional()
  height?: number;

  @ApiPropertyOptional({ description: 'Output width in pixels.' })
  @IsNumber()
  @IsOptional()
  width?: number;

  @ApiPropertyOptional({ description: 'Number of frames (<=441, 8n+1).', example: 41 })
  @IsNumber()
  @IsOptional()
  numFrames?: number;

  @ApiPropertyOptional({ description: 'Frame rate (frames per second).', example: 24 })
  @IsNumber()
  @IsOptional()
  frameRate?: number;

  @ApiPropertyOptional({ description: 'Number of inference steps for generation quality.', example: 30 })
  @IsNumber()
  @IsOptional()
  numInferenceSteps?: number;

  @ApiPropertyOptional({ description: 'Random seed for deterministic generation.' })
  @IsNumber()
  @IsOptional()
  seed?: number;

  @ApiPropertyOptional({ description: 'Negative prompt to steer generation away from concepts.' })
  @IsString()
  @IsOptional()
  negativePrompt?: string;
}
