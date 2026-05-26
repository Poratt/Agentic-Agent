import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class AgentRequestDto {
  @ApiProperty({
    description:
      'The user prompt that will be sent to the AI agent. This should include enough context and the desired output format.',
    example: 'Write a short summary of the following text...',
  })
  @IsString()
  @IsNotEmpty()
  prompt!: string;
}
