import { ApiProperty } from '@nestjs/swagger';
import { LlmProviderDto } from './llm-provider.dto';

export class LlmProviderResultResponseDto {
  @ApiProperty({ description: 'Whether the provider metadata request succeeded.', example: true })
  success!: boolean;

  @ApiProperty({ description: 'Human-readable result message.', example: 'LLM providers retrieved successfully.' })
  message!: string;

  @ApiProperty({ description: 'Safe provider metadata.', type: [LlmProviderDto], nullable: true })
  result!: LlmProviderDto[] | null;
}
