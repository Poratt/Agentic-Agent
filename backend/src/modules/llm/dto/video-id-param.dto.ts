import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional } from 'class-validator';

export class VideoIdParamDto {
  @ApiProperty({ description: 'Agnes video id returned by the create endpoint.', example: 'vid_abc123' })
  @IsNumber()
  @IsOptional()
  modelId?: number;
}
