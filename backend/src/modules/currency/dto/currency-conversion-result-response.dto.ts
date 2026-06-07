import { ApiProperty } from '@nestjs/swagger';
import { CurrencyConversionResponseDto } from './currency-conversion-response.dto';

export class CurrencyConversionResultResponseDto {
  @ApiProperty({ description: 'Whether the request succeeded.', example: true })
  success!: boolean;

  @ApiProperty({ description: 'Human-readable result message.', example: 'Currency converted successfully' })
  message!: string;

  @ApiProperty({ description: 'Currency conversion payload.', type: CurrencyConversionResponseDto, nullable: true })
  result!: CurrencyConversionResponseDto | null;
}
