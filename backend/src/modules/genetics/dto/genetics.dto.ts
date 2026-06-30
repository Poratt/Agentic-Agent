import { ApiProperty } from '@nestjs/swagger';
import { Genetics } from '../entities/genetics.entity';

/**
 * Single genetics record exposed by the API.
 *
 * Returned inside `ServiceResultContainer<GeneticsDto[]>` from `GET /genetics`
 * and as the unwrapped result of `GET /genetics/:name`.
 */
export class GeneticsDto {
    @ApiProperty({ description: 'Auto-incremented primary key.', example: 1 })
    id!: number;

    @ApiProperty({
        description: 'Hebrew display name. Unique — used as the lookup key from the frontend.',
        example: 'גורילה גלו',
    })
    name!: string;

    @ApiProperty({
        description: 'Short Hebrew description of the strain. Omitted when not set.',
        example: 'זן חזק במיוחד שזכה במקומות ראשונים ב-Cannabis Cup...',
        required: false,
    })
    description?: string;

    @ApiProperty({
        description: 'First genetic parent (parent1) — Hebrew or English name. Omitted when not set.',
        example: 'Chem Sis',
        required: false,
    })
    parent1?: string;

    @ApiProperty({
        description: 'Second genetic parent (parent2) — Hebrew or English name. Omitted when not set.',
        example: 'Sour Dubb',
        required: false,
    })
    parent2?: string;

    @ApiProperty({
        description: 'Country / region of origin (Hebrew text). Omitted when not set.',
        example: 'ארה"ב',
        required: false,
    })
    origin?: string;

    @ApiProperty({
        description: 'Cannabis type — היברידי / סאטיבה / אינדיקה. Omitted when not set.',
        enum: ['היברידי', 'סאטיבה', 'אינדיקה'],
        example: 'היברידי',
        required: false,
    })
    type?: string;

    @ApiProperty({
        description:
            'Hex accent color used by the frontend to render per-strain UI accents (dots, tag borders, etc.).',
        example: '#228B22',
    })
    color!: string;
}

/**
 * Maps a raw Genetics entity to a GeneticsDto.
 *
 * Converts nullable entity fields (`| null`) to optional DTO fields (`| undefined`)
 * so the entity can satisfy the DTO type contract without TypeScript errors.
 *
 * @param entity The source Genetics entity. Pass null to map a null result from findByName.
 */
export function toGeneticsDto(entity: Genetics | null): GeneticsDto | null {
    if (!entity) return null;
    return {
        id: entity.id,
        name: entity.name,
        description: entity.description ?? undefined,
        parent1: entity.parent1 ?? undefined,
        parent2: entity.parent2 ?? undefined,
        origin: entity.origin ?? undefined,
        type: entity.type ?? undefined,
        color: entity.color,
    };
}
