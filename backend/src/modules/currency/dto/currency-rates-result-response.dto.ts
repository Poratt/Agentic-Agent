import { ApiProperty } from '@nestjs/swagger';
import { CurrencyRatesResponseDto } from './currency-rates-response.dto';

export class CurrencyRatesResultResponseDto {
  @ApiProperty({ description: 'Whether the request succeeded.', example: true })
  success!: boolean;

  @ApiProperty({ description: 'Human-readable result message.', example: 'Currency rates retrieved successfully' })
  message!: string;

  @ApiProperty({ description: 'Currency rates payload.', type: CurrencyRatesResponseDto, nullable: true })
  result!: CurrencyRatesResponseDto | null;
}
