import { IsString, IsOptional, MaxLength, IsHexColor, MinLength, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for updating an existing genetics record.
 *
 * All fields are optional — only the provided fields will be updated.
 * The `name` field is not included because it is the unique identifier and should not be changed.
 * Use `GeneticsCreateDto` if you need to create a new record with a different name.
 */
export class GeneticsUpdateDto {
    @ApiPropertyOptional({
        description: 'Short Hebrew description of the strain. Pass null or empty string to clear.',
        example: 'זן חזק במיוחד שזכה במקומות ראשונים ב-Cannabis Cup...',
    })
    @IsOptional()
    @IsString()
    @MaxLength(2000, { message: 'Description must not exceed 2000 characters' })
    @MinLength(0, { message: 'Description must not be negative' })
    description?: string | null;

    @ApiPropertyOptional({
        description: 'First genetic parent (parent1) — Hebrew or English name. Pass null or empty string to clear.',
        example: 'Chem Sis',
    })
    @IsOptional()
    @IsString()
    @MaxLength(255, { message: 'Parent1 must not exceed 255 characters' })
    @MinLength(0, { message: 'Parent1 must not be negative' })
    parent1?: string | null;

    @ApiPropertyOptional({
        description: 'Second genetic parent (parent2) — Hebrew or English name. Pass null or empty string to clear.',
        example: 'Sour Dubb',
    })
    @IsOptional()
    @IsString()
    @MaxLength(255, { message: 'Parent2 must not exceed 255 characters' })
    @MinLength(0, { message: 'Parent2 must not be negative' })
    parent2?: string | null;

    @ApiPropertyOptional({
        description: 'Country / region of origin (Hebrew text). Pass null or empty string to clear.',
        example: 'ארה"ב',
    })
    @IsOptional()
    @IsString()
    @MaxLength(100, { message: 'Origin must not exceed 100 characters' })
    @MinLength(0, { message: 'Origin must not be negative' })
    origin?: string | null;

    @ApiPropertyOptional({
        description: 'Cannabis type. Must be one of: היברידי, סאטיבה, אינדיקה. Pass null to clear.',
        enum: ['היברידי', 'סאטיבה', 'אינדיקה'],
        example: 'היברידי',
    })
    @IsOptional()
    @IsString()
    @IsIn(['היברידי', 'סאטיבה', 'אינדיקה'], { message: 'Type must be one of: היברידי, סאטיבה, אינדיקה' })
    type?: string | null;

    @ApiPropertyOptional({
        description: 'THC percentage range (e.g. "15-21%").',
        example: '15-21%',
    })
    @IsOptional()
    @IsString()
    @MaxLength(50)
    thcRange?: string | null;

    @ApiPropertyOptional({
        description: 'Comma-separated list of dominant terpenes.',
        example: 'Caryophyllene, Limonene, Myrcene',
    })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    terpenes?: string | null;

    @ApiPropertyOptional({
        description: 'Comma-separated list of effect labels in Hebrew.',
        example: 'מרגיעה, מרדימה, משככת כאבים',
    })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    effects?: string | null;

    @ApiPropertyOptional({
        description:
            'Hex accent color used by the frontend to render per-strain UI accents (dots, tag borders, etc.). Must be a valid hex color starting with #.',
        example: '#228B22',
    })
    @IsOptional()
    @IsString()
    @IsHexColor({ message: 'Color must be a valid hex color (e.g., #228B22)' })
    color?: string;
}