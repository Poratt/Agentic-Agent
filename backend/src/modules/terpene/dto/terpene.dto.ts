import { ApiProperty } from '@nestjs/swagger';

/**
 * Single terpene record exposed by the API.
 *
 * Returned inside `ServiceResultContainer<TerpeneDto[]>` from `GET /terpenes`
 * and as the unwrapped result of `GET /terpenes/:name`.
 */
export class TerpeneDto {
    @ApiProperty({ description: 'Auto-incremented primary key.', example: 1 })
    id!: number;

    @ApiProperty({
        description: 'Hebrew display name. Unique — used as the lookup key from the frontend.',
        example: 'מירצן',
    })
    name!: string;

    @ApiProperty({
        description: 'English name of the terpene. Omitted when not set.',
        example: 'Myrcene',
        required: false,
    })
    englishName?: string | null;

    @ApiProperty({
        description: 'Short Hebrew description of the terpene. Omitted when not set.',
        example: 'הטרפן הנפוץ ביותר בקנאביס',
        required: false,
    })
    description?: string | null;

    @ApiProperty({
        description: 'Aroma profile of the terpene in Hebrew. Omitted when not set.',
        example: 'אדמה, פירות יער',
        required: false,
    })
    scent?: string | null;

    @ApiProperty({
        description: 'Effect tags associated with the terpene (Hebrew short labels).',
        type: [String],
        example: ['מרגיע', 'משכך כאבים'],
        required: false,
    })
    effects?: string[] | null;

    @ApiProperty({
        description:
            'Hex accent color used by the frontend to render per-terpene UI accents (dots, tag borders, etc.).',
        example: '#66BB6A',
    })
    color!: string;

    @ApiProperty({
        description: 'WCAG AA-safe variant of `color` for dark theme backgrounds (#080D1A).',
        example: '#66BB6A',
    })
    colorDark!: string;

    @ApiProperty({
        description: 'WCAG AA-safe variant of `color` for light theme backgrounds (#F0F4F8).',
        example: '#2E7D32',
    })
    colorLight!: string;
}