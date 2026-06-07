import { ApiProperty } from '@nestjs/swagger';

export class CurrencyConversionResponseDto {
  @ApiProperty({ description: 'Source currency code.', example: 'USD' })
  from!: string;

  @ApiProperty({ description: 'Target currency code.', example: 'ILS' })
  to!: string;

  @ApiProperty({ description: 'Original amount requested for conversion.', example: 100 })
  amount!: number;

  @ApiProperty({ description: 'Exchange rate from source currency to target currency.', example: 3.68 })
  rate!: number;

  @ApiProperty({ description: 'Converted amount.', example: 368 })
  result!: number;

  @ApiProperty({ description: 'Exchange-rate update date from the provider.', example: '2026-06-07' })
  date!: string;
}
