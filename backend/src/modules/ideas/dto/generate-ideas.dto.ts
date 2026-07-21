import { IsInt, IsOptional, IsString, Max, MaxLength, Min, Matches } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class GenerateIdeasDto {
  @ApiProperty({
    description: 'תחום עסקי לגיבוש רעיונות (משמש כסקופ לחיפוש ב-SearXNG)',
    example: 'AI-powered productivity tools for freelancers',
    maxLength: 500,
  })
  @IsString()
  @MaxLength(500)
  @Matches(/^[^`<>\r\n"']+$/, {
    message: 'התחום מכיל תווים לא חוקיים',
  })
  domain!: string;

  @ApiProperty({
    description: 'מספר הרעיונות המבוקש (1–10)',
    example: 5,
    required: false,
    minimum: 1,
    maximum: 10,
  })
  @IsOptional()
  @Transform(({ value }) => (value === undefined || value === null || value === '' ? undefined : Number(value)))
  @IsInt()
  @Min(1)
  @Max(10)
  count?: number;

  @ApiProperty({
    description: 'מפתח ספק ה-LLM (לדוגמה: openrouter, openai)',
    required: false,
  })
  @IsOptional()
  @IsString()
  provider?: string;

  @ApiProperty({
    description: 'מפתח המודל (לדוגמה: tencent/hy3, gpt-4o)',
    required: false,
  })
  @IsOptional()
  @IsString()
  model?: string;
}
