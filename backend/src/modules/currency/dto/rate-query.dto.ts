import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length, Matches } from 'class-validator';

export class RateQueryDto {
  @ApiPropertyOptional({
    description: 'Three-letter ISO currency code to use as the exchange-rate base.',
    example: 'USD',
    default: 'ILS',
  })
  @Transform(({ value }) => {
    if (typeof value !== 'string') {
      return 'ILS';
    }

    return value.trim().toUpperCase();
  })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  @Matches(/^[A-Z]{3}$/)
  base = 'ILS';
}
