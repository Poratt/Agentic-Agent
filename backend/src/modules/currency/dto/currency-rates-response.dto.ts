import { ApiProperty } from '@nestjs/swagger';

export class CurrencyRatesResponseDto {
  @ApiProperty({ description: 'Base currency code used for the rates.', example: 'USD' })
  base!: string;

  @ApiProperty({ description: 'Exchange-rate update date from the provider.', example: '2026-06-07' })
  date!: string;

  @ApiProperty({
    description: 'Map of currency code to exchange-rate value.',
    example: { ILS: 3.68, EUR: 0.92, GBP: 0.78 },
    additionalProperties: { type: 'number' },
  })
  rates!: Record<string, number>;
}
