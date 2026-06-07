import { Type, Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, Length, Matches, Min } from 'class-validator';

const normalizeCurrencyCode = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string') {
    return value;
  }

  return value.trim().toUpperCase();
};

export class ConvertQueryDto {
  @ApiProperty({
    description: 'Three-letter ISO currency code to convert from.',
    example: 'USD',
  })
  @Transform(normalizeCurrencyCode)
  @IsString()
  @Length(3, 3)
  @Matches(/^[A-Z]{3}$/)
  from!: string;

  @ApiProperty({
    description: 'Three-letter ISO currency code to convert to.',
    example: 'ILS',
  })
  @Transform(normalizeCurrencyCode)
  @IsString()
  @Length(3, 3)
  @Matches(/^[A-Z]{3}$/)
  to!: string;

  @ApiProperty({
    description: 'Positive numeric amount to convert.',
    example: 100,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount!: number;
}
