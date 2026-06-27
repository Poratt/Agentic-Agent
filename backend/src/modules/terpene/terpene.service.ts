import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Terpene } from './entities/terpene.entity';
import { TerpeneDto } from './dto/terpene.dto';

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
}