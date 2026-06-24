import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('strains')
export class Strain {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ type: 'varchar', length: 255 })
    name!: string;

    @Column({ type: 'varchar', length: 255, default: '' })
    enName!: string;

    @Column({ type: 'boolean', default: false })
    isNew!: boolean;

    @Column({ type: 'varchar', length: 100, default: '' })
    rating!: string;

    @Column({ type: 'varchar', length: 255, default: '' })
    deal!: string;

    @Column({ type: 'varchar', length: 255, default: '' })
    marketer!: string;

    @Column({ type: 'varchar', length: 255, default: '' })
    manufacturer!: string;

    @Column({ type: 'varchar', length: 255, default: '' })
    brand!: string;

    @Column({ type: 'varchar', length: 100, default: '' })
    expiry!: string;

    @Column({ type: 'varchar', length: 100, default: '' })
    price!: string;

    @Column({ type: 'varchar', length: 100, default: '' })
    catalogPrice!: string;

    @Column({ type: 'varchar', length: 255, default: '' })
    parent1!: string;

    @Column({ type: 'varchar', length: 255, default: '' })
    parent2!: string;

    @Column({ type: 'varchar', length: 255, default: '' })
    originStrain!: string;

    @Column({ type: 'varchar', length: 100, default: '' })
    countryOfOrigin!: string;

    @Column({ type: 'text', nullable: true })
    terpenes!: string;

    @Column({ type: 'varchar', length: 255, default: '' })
    packageType!: string;

    @Column({ type: 'simple-json', nullable: true })
    symbols!: { url: string; alt: string }[];

    @Column({ type: 'varchar', length: 500, default: '' })
    imageUrl!: string;

    @Column({ type: 'varchar', length: 500, default: '' })
    productUrl!: string;

    @Column({ type: 'varchar', length: 255, default: '' })
    category!: string;

    @Column({ type: 'varchar', length: 255, default: '' })
    family!: string;

    @Column({ type: 'varchar', length: 255, default: '' })
    growType!: string;

    @Column({ type: 'varchar', length: 100, default: '' })
    thc!: string;

    @Column({ type: 'varchar', length: 100, default: '' })
    cbd!: string;
}