import { ApiProperty } from '@nestjs/swagger';

/**
 * A single terpene record returned by the batch enrichment LLM call.
 * These are the fields the LLM is asked to infer or look up.
 */
export class EnrichTerpeneItemDto {
    @ApiProperty({ description: 'Exact terpene name as it appears in Jane.', example: 'מירצן' })
    name!: string;

    @ApiProperty({
        description: 'Hebrew description of the terpene, 1-3 sentences.',
        example: 'הטרפן הנפוץ ביותר בקנאביס, מספק ריח הדיר וטעם ארצי...',
        required: false,
    })
    description?: string;

    @ApiProperty({
        description: 'Aroma profile in Hebrew.',
        example: 'אדמה, פירות יער',
        required: false,
    })
    scent?: string;

    @ApiProperty({
        description: 'Comma-separated list of short Hebrew effect labels.',
        example: 'מרגיע, משכך כאבים',
        required: false,
    })
    effects?: string;

    @ApiProperty({
        description: 'Hex accent color matching the terpene aromatic character.',
        example: '#66BB6A',
    })
    color!: string;
}

/**
 * Root of the JSON object returned by the terpene enrichment LLM.
 */
export class EnrichTerpeneResponseDto {
    @ApiProperty({ type: [EnrichTerpeneItemDto], description: 'Array of enriched terpene records.' })
    terpenes!: EnrichTerpeneItemDto[];
}
