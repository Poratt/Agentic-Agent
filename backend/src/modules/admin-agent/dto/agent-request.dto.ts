import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class AgentRequestDto {
  @ApiProperty({
    description: 'The user prompt that will be sent to the AI agent.',
    example: 'Write a short summary of the following text...',
  })
  @IsString()
  @IsNotEmpty()
  prompt!: string;

  @ApiPropertyOptional({
    description: 'The specific chat session ID associated with this message thread.',
    example: 42,
  })
  @IsNumber()
  @IsOptional()
  sessionId?: number;
}