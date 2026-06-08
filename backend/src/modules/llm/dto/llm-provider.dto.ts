import { ApiProperty } from '@nestjs/swagger';

export class LlmProviderDto {
  @ApiProperty({ description: 'Provider identifier.', example: 'ollama' })
  id!: string;

  @ApiProperty({ description: 'Whether this provider is the active provider.', example: true })
  active!: boolean;

  @ApiProperty({ description: 'Whether the provider has the required local configuration.', example: true })
  configured!: boolean;

  @ApiProperty({ description: 'Whether the provider can currently be queried for local availability.', example: true })
  available!: boolean;

  @ApiProperty({ description: 'Configured model for this provider when available.', example: 'llama3', required: false })
  configuredModel?: string;

  @ApiProperty({
    description: 'Available model names reported by the provider when the provider supports local listing.',
    example: ['llama3', 'mistral'],
    required: false,
    type: [String],
  })
  models?: string[];
}
