import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Terpene } from './entities/terpene.entity';
import { TerpeneDto } from './dto/terpene.dto';
import { TerpeneCreateDto } from './dto/terpene-create.dto';
import { TerpeneUpdateDto } from './dto/terpene-update.dto';
import { LlmClientService } from '../llm/services/llm-client.service';
import { parseLlmJson } from '../llm/utils/llm-json-parser';
import {
    TERPENE_ENRICH_SYSTEM_PROMPT,
    buildTerpeneEnrichUserPrompt,
} from './constants/terpene-enrich-prompts.constant';

const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;
const DEFAULT_COLOR = '#808080';
const UNKNOWN_LABEL = 'לא ידוע';
const MIN_NAME_LENGTH = 2;

/**
 * Service for the terpene reference catalog.
 *
 * The catalog is a small static-ish set of seed rows. Reads are always
 * ordered alphabetically by Hebrew name so consumers can render a stable
 * list without sorting on their side.
 */
@Injectable()
export class TerpeneService {
    private readonly logger = new Logger(TerpeneService.name);

    constructor(
        @InjectRepository(Terpene)
        private readonly terpeneRepository: Repository<Terpene>,
        private readonly llmClientService: LlmClientService,
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

    /**
     * Batch-enrich terpene names that are missing from the DB.
     *
     * Filters the input list, queries the DB for existing names, asks the
     * configured LLM for description / scent / effects / color in a single
     * batch call, and upserts the parsed records.
     *
     * The LLM returns `effects` as a comma-separated string; this method
     * splits it into a `string[]` so it matches the entity's `simple-array`
     * column.
     *
     * Idempotent: a name that already has a row in the DB is not sent to the
     * LLM, so re-running this method for the same input is a no-op once the
     * catalog is complete.
     *
     * @param names Candidate terpene names extracted from scraped Jane items.
     *   Empty / `'לא ידוע'` / very short values are filtered out before the
     *   DB query. Duplicates are deduplicated.
     * @returns Resolves once the LLM call and DB upsert are done. Returns
     *   silently on parse failures — callers do not need try/catch.
     */
    async enrichBatch(names: string[]): Promise<void> {
        const filtered = this.filterNames(names);
        if (!filtered.length) {
            return;
        }

        const existing = await this.terpeneRepository.find({
            where: { name: In(filtered) },
            select: ['name'],
        });
        const existingNames = new Set(existing.map((row) => row.name));
        const missing = filtered.filter((name) => !existingNames.has(name));

        if (!missing.length) {
            this.logger.debug(`All ${filtered.length} terpenes already exist in DB — skipping enrich.`);
            return;
        }

        this.logger.log(`Enriching ${missing.length} missing terpenes via LLM...`);

        const response = await this.llmClientService.generateResponse({
            prompt: buildTerpeneEnrichUserPrompt(missing),
            systemContext: TERPENE_ENRICH_SYSTEM_PROMPT,
        });

        const parsed = parseLlmJson<{ terpenes?: unknown[] }>(response.content, 'terpene-enrich');
        if (!parsed || !Array.isArray(parsed.terpenes)) {
            return;
        }

        const entities = parsed.terpenes
            .map((item) => this.mapTerpeneRecord(item))
            .filter((record): record is Partial<Terpene> => record !== null);

        if (!entities.length) {
            this.logger.warn(`[terpene-enrich] LLM returned 0 valid records for ${missing.length} missing names.`);
            return;
        }

        await this.terpeneRepository.save(entities.map((record) => this.terpeneRepository.create(record)));
        this.logger.log(`Enriched and saved ${entities.length} terpenes.`);
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
     * Maps a single raw LLM item to a partial `Terpene` row ready for
     * `Repository.create()`. Returns `null` for items missing the required
     * `name` field. The LLM returns `effects` as a comma-separated string;
     * this method splits it into a trimmed `string[]` (or `null` when empty).
     * `color` must be a 6-digit hex; otherwise falls back to `DEFAULT_COLOR`.
     */
    private mapTerpeneRecord(raw: unknown): Partial<Terpene> | null {
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

        return {
            name,
            description: this.toNullableString(item.description),
            scent: this.toNullableString(item.scent),
            effects: this.parseEffects(item.effects),
            color,
        };
    }

    /**
     * Splits a comma-separated effects string into a trimmed `string[]`,
     * dropping empty entries. Returns `null` when no usable effects remain.
     */
    private parseEffects(value: unknown): string[] | null {
        if (typeof value !== 'string') {
            return null;
        }
        const effects = value
            .split(',')
            .map((entry) => entry.trim())
            .filter((entry) => entry.length > 0);
        return effects.length > 0 ? effects : null;
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
}
