import { IsString, IsOptional, MaxLength, IsHexColor, IsArray, MinLength, ValidateIf } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for updating an existing terpene.
 *
 * All fields are optional — only the provided fields will be updated.
 * The `name` field is not included because it is the unique identifier and should not be changed.
 * Use `TerpeneCreateDto` if you need to create a new record with a different name.
 */
export class TerpeneUpdateDto {
    @ApiPropertyOptional({
        description: 'Short Hebrew description of the terpene. Pass null or empty string to clear.',
        example: 'הטרפן הנפוץ ביותר בקנאביס',
    })
    @IsOptional()
    @IsString()
    @MaxLength(2000, { message: 'Description must not exceed 2000 characters' })
    @MinLength(0, { message: 'Description must not be negative' })
    description?: string | null;

    @ApiPropertyOptional({
        description: 'Aroma profile of the terpene in Hebrew. Pass null or empty string to clear.',
        example: 'אדמה, פירות יער',
    })
    @IsOptional()
    @IsString()
    @MaxLength(255, { message: 'Scent must not exceed 255 characters' })
    @MinLength(0, { message: 'Scent must not be negative' })
    scent?: string | null;

    @ApiPropertyOptional({
        description: 'Effect tags associated with the terpene (Hebrew short labels). Pass empty array to clear.',
        type: [String],
        example: ['מרגיע', 'משכך כאבים'],
    })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    effects?: string[] | null;

    @ApiPropertyOptional({
        description: 'Hex accent color used by the frontend to render per-terpene UI accents (dots, tag borders, etc.). Must be a valid hex color starting with #.',
        example: '#66BB6A',
    })
    @IsOptional()
    @IsString()
    @IsHexColor({ message: 'Color must be a valid hex color (e.g., #66BB6A)' })
    color?: string;
}