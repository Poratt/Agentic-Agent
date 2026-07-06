import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * TypeORM entity backing the `terpene` table.
 *
 * Each row describes a single cannabis terpene (name, scent, optional effects,
 * optional long-form description, and a brand color used by the frontend
 * to render per-terpene accent UI such as hover tooltips).
 */
@Entity('terpene')
export class Terpene {
    @ApiProperty({ description: 'Auto-incremented primary key.', example: 1 })
    @PrimaryGeneratedColumn()
    id!: number;

    @ApiProperty({
        description: 'Hebrew display name. Unique — used as the lookup key from the frontend.',
        example: 'מירצן',
    })
    @Column({ type: 'varchar', length: 100, unique: true })
    name!: string;

    @ApiProperty({
        description: 'English name of the terpene. Auto-translated from Hebrew. Optional.',
        example: 'Myrcene',
        required: false,
    })
    @Column({ type: 'varchar', length: 100, nullable: true })
    englishName!: string | null;

    @ApiProperty({
        description: 'Short Hebrew description of the terpene. Optional.',
        example: 'הטרפן הנפוץ ביותר בקנאביס',
        required: false,
    })
    @Column({ type: 'text', nullable: true })
    description!: string | null;

    @ApiProperty({
        description: 'Aroma profile of the terpene in Hebrew. Optional.',
        example: 'אדמה, פירות יער',
        required: false,
    })
    @Column({ type: 'varchar', length: 255, nullable: true })
    scent!: string | null;

    @ApiProperty({
        description: 'Effect tags associated with the terpene (Hebrew short labels).',
        type: [String],
        example: ['מרגיע', 'משכך כאבים'],
        required: false,
    })
    @Column({ type: 'simple-array', nullable: true })
    effects!: string[] | null;

    @ApiProperty({
        description:
            'Hex accent color used by the frontend to render per-terpene UI accents (dots, tag borders, etc.).',
        example: '#66BB6A',
    })
    @Column({ type: 'varchar', length: 9 })
    color!: string;

    @ApiProperty({
        description:
            'WCAG AA-safe variant of `color` for dark theme backgrounds (#080D1A).',
        example: '#66BB6A',
    })
    @Column({ type: 'varchar', length: 7, default: '#808080' })
    colorDark!: string;

    @ApiProperty({
        description:
            'WCAG AA-safe variant of `color` for light theme backgrounds (#F0F4F8).',
        example: '#2E7D32',
    })
    @Column({ type: 'varchar', length: 7, default: '#808080' })
    colorLight!: string;
}