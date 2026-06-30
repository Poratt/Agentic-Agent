import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Terpene } from './entities/terpene.entity';
import { TerpeneDto } from './dto/terpene.dto';
import { TerpeneCreateDto } from './dto/terpene-create.dto';
import { TerpeneUpdateDto } from './dto/terpene-update.dto';

/**
 * Service for the terpene reference catalog.
 *
 * The catalog is a small static-ish set of seed rows. Reads are always
 * ordered alphabetically by Hebrew name so consumers can render a stable
 * list without sorting on their side.
 */
@Injectable()
export class TerpeneService {
    constructor(
        @InjectRepository(Terpene)
        private readonly terpeneRepository: Repository<Terpene>,
    ) {}

    /**
     * Return every terpene in the catalog, ordered alphabetically by Hebrew name.
     *
     * @returns Array of Terpene entities (never null, may be empty if the seed has not run).
     */
    async findAll(): Promise<Terpene[]> {
        return this.terpeneRepository.find({ order: { name: 'ASC' } });
    }

    /**
     * Look up a single terpene by its unique Hebrew name.
     *
     * @param name Hebrew name to look up. Must match the `name` column exactly (case-insensitive match would be a separate concern).
     * @returns The matching entity, or null if no row exists for the given name.
     */
    async findByName(name: string): Promise<Terpene | null> {
        return this.terpeneRepository.findOne({ where: { name } });
    }

    /**
     * Create a new terpene record.
     *
     * @param dto Data for the new terpene. Name must be unique.
     * @returns The created Terpene entity.
     * @throws ConflictException if a terpene with the same name already exists.
     * @throws 500 on unexpected database or server failure.
     */
    async create(dto: TerpeneCreateDto): Promise<Terpene> {
        // Check for duplicate name
        const existing = await this.terpeneRepository.findOne({ where: { name: dto.name } });
        if (existing) {
            throw new ConflictException(`Terpene with name "${dto.name}" already exists`);
        }

        const terpene = this.terpeneRepository.create({
            ...dto,
            effects: dto.effects ?? null,
        });

        return this.terpeneRepository.save(terpene);
    }

    /**
     * Update an existing terpene by its unique Hebrew name.
     *
     * @param name Hebrew name of the terpene to update.
     * @param dto Partial data to update. Only provided fields are modified.
     * @returns The updated Terpene entity.
     * @throws NotFoundException if no terpene with the given name exists.
     * @throws 500 on unexpected database or server failure.
     */
    async update(name: string, dto: TerpeneUpdateDto): Promise<Terpene> {
        const terpene = await this.terpeneRepository.findOne({ where: { name } });
        if (!terpene) {
            throw new NotFoundException(`Terpene with name "${name}" not found`);
        }

        // Merge the updates
        Object.assign(terpene, {
            ...dto,
            description: dto.description ?? terpene.description,
            scent: dto.scent ?? terpene.scent,
            effects: dto.effects !== undefined ? dto.effects : terpene.effects,
            color: dto.color ?? terpene.color,
        });

        return this.terpeneRepository.save(terpene);
    }
}