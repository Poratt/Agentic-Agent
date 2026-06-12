import { ApiProperty } from '@nestjs/swagger';
import { ProviderResponseDto } from './llm-provider.dto';

export class LlmAdminProviderResultResponseDto {
  @ApiProperty({ description: 'Whether the providers request succeeded.', example: true })
  success!: boolean;

  @ApiProperty({ description: 'Human-readable result message.', example: 'LLM providers retrieved successfully.' })
  message!: string;

  @ApiProperty({ description: 'Provider metadata.', type: [ProviderResponseDto], nullable: true })
  result!: ProviderResponseDto[] | null;
}
