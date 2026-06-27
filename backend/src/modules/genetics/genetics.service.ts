import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Genetics } from './entities/genetics.entity';

/**
 * Service for the genetics reference catalog.
 *
 * The catalog is a static-ish set of seed rows. Reads are always
 * ordered alphabetically by Hebrew name so consumers can render a stable
 * list without sorting on their side.
 */
@Injectable()
export class GeneticsService {
    constructor(
        @InjectRepository(Genetics)
        private readonly geneticsRepository: Repository<Genetics>,
    ) {}

    /**
     * Return every genetics row in the catalog, ordered alphabetically by Hebrew name.
     *
     * @returns Array of Genetics entities (never null, may be empty if the seed has not run).
     */
    async findAll(): Promise<Genetics[]> {
        return this.geneticsRepository.find({ order: { name: 'ASC' } });
    }

    /**
     * Look up a single genetics row by its unique Hebrew name.
     *
     * @param name Hebrew name to look up. Must match the `name` column exactly (case-insensitive match would be a separate concern).
     * @returns The matching entity, or null if no row exists for the given name.
     */
    async findByName(name: string): Promise<Genetics | null> {
        return this.geneticsRepository.findOne({ where: { name } });
    }
}
