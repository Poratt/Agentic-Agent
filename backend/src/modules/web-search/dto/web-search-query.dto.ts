import { IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class WebSearchQueryDto {
  @ApiProperty({
    description: 'The search query to look up on the web',
    example: 'Ice Burn cannabis strain genetics',
    minLength: 2,
    maxLength: 500,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(500)
  query!: string;
}
