import { IsString, IsNotEmpty, MaxLength, IsHexColor, IsArray, IsOptional, ValidateIf, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for creating a new terpene.
 *
 * The `name` must be unique and will be used as the lookup key from the frontend.
 * `color` must be a valid hex color string (e.g., `#66BB6A`).
 * `effects` is optional; when provided all items must be non-empty strings.
 */
export class TerpeneCreateDto {
    @ApiProperty({
        description: 'Hebrew display name. Must be unique. Used as the lookup key from the frontend.',
        example: 'מירצן',
    })
    @IsString()
    @IsNotEmpty({ message: 'Name is required' })
    @MaxLength(100, { message: 'Name must not exceed 100 characters' })
    @MinLength(1, { message: 'Name must not be empty' })
    name!: string;

    @ApiPropertyOptional({
        description: 'English name of the terpene.',
        example: 'Myrcene',
    })
    @IsOptional()
    @IsString()
    @MaxLength(100, { message: 'English name must not exceed 100 characters' })
    englishName?: string;

    @ApiPropertyOptional({
        description: 'Short Hebrew description of the terpene.',
        example: 'הטרפן הנפוץ ביותר בקנאביס',
    })
    @IsOptional()
    @IsString()
    @MaxLength(2000, { message: 'Description must not exceed 2000 characters' })
    description?: string;

    @ApiPropertyOptional({
        description: 'Aroma profile of the terpene in Hebrew.',
        example: 'אדמה, פירות יער',
    })
    @IsOptional()
    @IsString()
    @MaxLength(255, { message: 'Scent must not exceed 255 characters' })
    scent?: string;

    @ApiPropertyOptional({
        description: 'Effect tags associated with the terpene (Hebrew short labels).',
        type: [String],
        example: ['מרגיע', 'משכך כאבים'],
    })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    effects?: string[];

    @ApiProperty({
        description: 'Hex accent color used by the frontend to render per-terpene UI accents (dots, tag borders, etc.). Must be a valid hex color starting with #.',
        example: '#66BB6A',
    })
    @IsString()
    @IsNotEmpty({ message: 'Color is required' })
    @IsHexColor({ message: 'Color must be a valid hex color (e.g., #66BB6A)' })
    color!: string;
}