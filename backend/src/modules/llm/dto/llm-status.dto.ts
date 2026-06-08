import { ApiProperty } from '@nestjs/swagger';
import { LlmProviderDto } from './llm-provider.dto';

export class LlmStatusDto {
  @ApiProperty({ description: 'Currently active provider id.', example: 'ollama' })
  activeProvider!: string;

  @ApiProperty({ description: 'Currently active model id.', example: 'llama3' })
  activeModel!: string;

  @ApiProperty({ description: 'Safe provider status list.', type: [LlmProviderDto] })
  providers!: LlmProviderDto[];
}
