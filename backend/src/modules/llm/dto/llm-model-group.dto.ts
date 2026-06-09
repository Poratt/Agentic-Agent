import { ApiProperty } from '@nestjs/swagger';
import { LlmModelOptionDto } from './llm-model-option.dto';
import { LlmProvider } from '../types/llm.types';

export class LlmModelGroupDto {

  @ApiProperty({ description: 'LLM provider label.', example: 'openrouter' })
  label!: LlmProvider;

  @ApiProperty({ description: 'Model options for this provider.', type: [LlmModelOptionDto] })
  items!: LlmModelOptionDto[];
}


// export class LlmModel {
//   @ApiProperty({ description: 'The unique identifier of the model.', example: 'llama3' })
//   id!: string;

//   @ApiProperty({ description: 'The display name of the model.', example: 'Llama 3' })
//   label!: string;

//   // value
//   @ApiProperty({ description: ''})
//   value!: string;


//   @ApiProperty({ description: 'The provider of the model.', example: 'ollama' })
//   provider!: string;


// }