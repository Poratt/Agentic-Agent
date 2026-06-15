import { PartialType } from '@nestjs/swagger';
import { CreateLlmProviderDto } from './create-llm-provider.dto';

export class UpdateLlmProviderDto extends PartialType(CreateLlmProviderDto) { }