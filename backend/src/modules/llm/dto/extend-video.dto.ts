import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsIn } from 'class-validator';
import { IsSafeUrl } from './validate-safe-url.validator';

export class ExtendVideoDto {
  @ApiPropertyOptional({ description: 'DB model id of an Agnes video model. Resolved automatically when omitted.', example: 14 })
  @IsOptional()
  @IsNumber()
  modelId?: number;

  @ApiPropertyOptional({ description: 'Agnes video id of a previously generated video. The last frame is extracted automatically.', example: 'task_abc123' })
  @IsString()
  @IsOptional()
  sourceVideoId?: string;

  @ApiPropertyOptional({ description: 'Direct downloadable URL of a source video (.mp4) to extract the last frame from. Must be a public https URL.' })
  @IsString()
  @IsOptional()
  @IsSafeUrl()
  sourceVideoUrl?: string;

  @ApiProperty({ description: 'Continuation prompt describing how the video should proceed from the last frame.', example: 'the camera slowly zooms in and the waves keep rolling' })
  @IsString()
  @IsNotEmpty()
  prompt!: string;

  @ApiPropertyOptional({ description: 'Input frame is sent as image-to-video. Defaults to ti2vid.', enum: ['ti2vid', 'keyframes'], default: 'ti2vid' })
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
