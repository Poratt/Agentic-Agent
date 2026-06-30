import { ApiProperty } from '@nestjs/swagger';

/**
 * A single genetics record returned by the batch enrichment LLM call.
 * These are the fields the LLM is asked to infer or look up.
 */
export class EnrichGeneticsItemDto {
    @ApiProperty({ description: 'Exact strain name as it appears in Jane.', example: 'גורילה גלו' })
    name!: string;

    @ApiProperty({
        description: 'Hebrew description of the strain, 1-3 sentences.',
        example: 'זן חזק במיוחד שזכה במקומות ראשונים ב-Cannabis Cup...',
        required: false,
    })
    description?: string;

    @ApiProperty({
        description: 'First genetic parent (Hebrew or English name).',
        example: 'Chem Sis',
        required: false,
    })
    parent1?: string;

    @ApiProperty({
        description: 'Second genetic parent (Hebrew or English name).',
        example: 'Sour Dubb',
        required: false,
    })
    parent2?: string;

    @ApiProperty({
        description: 'Country or region of origin in Hebrew.',
        example: 'ארה"ב',
        required: false,
    })
    origin?: string;

    @ApiProperty({
        description: 'Cannabis type.',
        enum: ['היברידי', 'סאטיבה', 'אינדיקה'],
        example: 'היברידי',
        required: false,
    })
    type?: string;

    @ApiProperty({
        description: 'Hex accent color matching the strain character.',
        example: '#228B22',
    })
    color!: string;
}

/**
 * Root of the JSON object returned by the genetics enrichment LLM.
 */
export class EnrichGeneticsResponseDto {
    @ApiProperty({ type: [EnrichGeneticsItemDto], description: 'Array of enriched genetics records.' })
    genetics!: EnrichGeneticsItemDto[];
}
