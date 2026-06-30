import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Genetics } from './entities/genetics.entity';
import { GeneticsCreateDto } from './dto/genetics-create.dto';
import { GeneticsUpdateDto } from './dto/genetics-update.dto';
import { LlmClientService } from '../llm/services/llm-client.service';
import { parseLlmJson } from '../llm/utils/llm-json-parser';
import {
    GENETICS_ENRICH_SYSTEM_PROMPT,
    buildGeneticsEnrichUserPrompt,
} from './constants/genetics-enrich-prompts.constant';

const VALID_TYPES = new Set(['היברידי', 'סאטיבה', 'אינדיקה']);
const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;
const DEFAULT_COLOR = '#808080';
const UNKNOWN_LABEL = 'לא ידוע';
const MIN_NAME_LENGTH = 2;

/**
 * Service for the genetics reference catalog.
 *
 * The catalog is a static-ish set of seed rows. Reads are always
 * ordered alphabetically by Hebrew name so consumers can render a stable
 * list without sorting on their side.
 */
@Injectable()
export class GeneticsService {
    private readonly logger = new Logger(GeneticsService.name);

    constructor(
        @InjectRepository(Genetics)
        private readonly geneticsRepository: Repository<Genetics>,
        private readonly llmClientService: LlmClientService,
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

    /**
     * Batch-enrich genetics (strain) names that are missing from the DB.
     *
     * Filters the input list, queries the DB for existing names, asks the
     * configured LLM for descriptions / parents / origin / type / color in a
     * single batch call, and upserts the parsed records.
     *
     * Idempotent: a name that already has a row in the DB is not sent to the
     * LLM, so re-running this method for the same input is a no-op once the
     * catalog is complete.
     *
     * @param names Candidate strain names extracted from scraped Jane items.
     *   Empty / `'לא ידוע'` / very short values are filtered out before the DB
     *   query. Duplicates are deduplicated.
     * @returns Resolves once the LLM call and DB upsert are done. Returns
     *   silently on parse failures — callers do not need try/catch.
     */
    async enrichBatch(names: string[]): Promise<void> {
        const filtered = this.filterNames(names);
        if (!filtered.length) {
            return;
        }

        const existing = await this.geneticsRepository.find({
            where: { name: In(filtered) },
            select: ['name'],
        });
        const existingNames = new Set(existing.map((row) => row.name));
        const missing = filtered.filter((name) => !existingNames.has(name));

        if (!missing.length) {
            this.logger.debug(`All ${filtered.length} genetics already exist in DB — skipping enrich.`);
            return;
        }

        this.logger.log(`Enriching ${missing.length} missing genetics via LLM...`);

        const response = await this.llmClientService.generateResponse({
            prompt: buildGeneticsEnrichUserPrompt(missing),
            systemContext: GENETICS_ENRICH_SYSTEM_PROMPT,
        });

        const parsed = parseLlmJson<{ genetics?: unknown[] }>(response.content, 'genetics-enrich');
        if (!parsed || !Array.isArray(parsed.genetics)) {
            return;
        }

        const entities = parsed.genetics
            .map((item) => this.mapGeneticsRecord(item))
            .filter((record): record is Partial<Genetics> => record !== null);

        if (!entities.length) {
            this.logger.warn(`[genetics-enrich] LLM returned 0 valid records for ${missing.length} missing names.`);
            return;
        }

        await this.geneticsRepository.save(entities.map((record) => this.geneticsRepository.create(record)));
        this.logger.log(`Enriched and saved ${entities.length} genetics.`);
    }

    /**
     * Sanitizes a raw name list: trims, drops empties / placeholder
     * `'לא ידוע'` / very short / non-Hebrew-non-word garbage, and dedupes
     * while preserving insertion order.
     */
    private filterNames(names: string[]): string[] {
        const seen = new Set<string>();
        const result: string[] = [];

        for (const raw of names) {
            const name = raw?.trim();
            if (!name) {
                continue;
            }
            if (name === UNKNOWN_LABEL) {
                continue;
            }
            if (name.length < MIN_NAME_LENGTH) {
                continue;
            }
            // Require at least one Hebrew letter or word char — drops "NaN",
            // pure punctuation, and other obvious scraper artifacts.
            if (!/[֐-׿\w]/.test(name)) {
                continue;
            }
            if (seen.has(name)) {
                continue;
            }
            seen.add(name);
            result.push(name);
        }

        return result;
    }

    /**
     * Maps a single raw LLM item to a partial `Genetics` row ready for
     * `Repository.create()`. Returns `null` for items missing the required
     * `name` field. Applies field-level validation:
     * - `color` must be a 6-digit hex; otherwise falls back to `DEFAULT_COLOR`.
     * - `type` must be one of `היברידי | סאטיבה | אינדיקה`; otherwise `null`.
     * - All optional string fields collapse empty / whitespace-only values to `null`.
     */
    private mapGeneticsRecord(raw: unknown): Partial<Genetics> | null {
        if (!raw || typeof raw !== 'object') {
            return null;
        }

        const item = raw as Record<string, unknown>;
        const name = typeof item.name === 'string' ? item.name.trim() : '';
        if (!name) {
            return null;
        }

        const color = typeof item.color === 'string' && HEX_COLOR_REGEX.test(item.color.trim())
            ? item.color.trim()
            : DEFAULT_COLOR;

        const rawType = typeof item.type === 'string' ? item.type.trim() : '';
        const type = VALID_TYPES.has(rawType) ? rawType : null;

        return {
            name,
            description: this.toNullableString(item.description),
            parent1: this.toNullableString(item.parent1),
            parent2: this.toNullableString(item.parent2),
            origin: this.toNullableString(item.origin),
            type,
            color,
        };
    }

    /**
     * Returns the trimmed string when it has non-whitespace content,
     * otherwise `null`. Centralizes the LLM "empty / null / missing" collapse.
     */
    private toNullableString(value: unknown): string | null {
        if (typeof value !== 'string') {
            return null;
        }
        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : null;
    }

    /**
     * Create a new genetics record.
     *
     * @param dto Data for the new genetics record. Name must be unique.
     * @returns The created Genetics entity.
     * @throws ConflictException if a genetics with the same name already exists.
     * @throws 500 on unexpected database or server failure.
     */
    async create(dto: GeneticsCreateDto): Promise<Genetics> {
        // Check for duplicate name
        const existing = await this.geneticsRepository.findOne({ where: { name: dto.name } });
        if (existing) {
            throw new ConflictException(`Genetics with name "${dto.name}" already exists`);
        }

        const genetics = this.geneticsRepository.create({
            ...dto,
            description: dto.description ?? null,
            parent1: dto.parent1 ?? null,
            parent2: dto.parent2 ?? null,
            origin: dto.origin ?? null,
            type: dto.type ?? null,
        });

        return this.geneticsRepository.save(genetics);
    }

    /**
     * Update an existing genetics record by its unique Hebrew name.
     *
     * @param name Hebrew name of the genetics to update.
     * @param dto Partial data to update. Only provided fields are modified.
     * @returns The updated Genetics entity.
     * @throws NotFoundException if no genetics with the given name exists.
     * @throws 500 on unexpected database or server failure.
     */
    async update(name: string, dto: GeneticsUpdateDto): Promise<Genetics> {
        const genetics = await this.geneticsRepository.findOne({ where: { name } });
        if (!genetics) {
            throw new NotFoundException(`Genetics with name "${name}" not found`);
        }

        // Merge the updates
        Object.assign(genetics, {
            ...dto,
            description: dto.description !== undefined ? dto.description : genetics.description,
            parent1: dto.parent1 !== undefined ? dto.parent1 : genetics.parent1,
            parent2: dto.parent2 !== undefined ? dto.parent2 : genetics.parent2,
            origin: dto.origin !== undefined ? dto.origin : genetics.origin,
            type: dto.type !== undefined ? dto.type : genetics.type,
            color: dto.color ?? genetics.color,
        });

        return this.geneticsRepository.save(genetics);
    }
}
