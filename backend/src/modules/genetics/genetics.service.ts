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
import { deriveThemeColors } from '../../core/utils/color-contrast.util';
import { WebSearchService } from '../web-search/web-search.service';

const VALID_TYPES = new Set(['היברידי', 'סאטיבה', 'אינדיקה']);
const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;
const DEFAULT_COLOR = '#808080';
const UNKNOWN_LABEL = 'לא ידוע';
const MIN_NAME_LENGTH = 2;
const CHUNK_SIZE = 15;

@Injectable()
export class GeneticsService {
    private readonly logger = new Logger(GeneticsService.name);

    constructor(
        @InjectRepository(Genetics)
        private readonly geneticsRepository: Repository<Genetics>,
        private readonly llmClientService: LlmClientService,
        private readonly webSearchService: WebSearchService,
    ) { }

    async findAll(): Promise<Genetics[]> {
        return this.geneticsRepository.find({ order: { name: 'ASC' } });
    }

    async findByName(name: string): Promise<Genetics | null> {
        return this.geneticsRepository.findOne({ where: { name } });
    }

    async enrichBatch(names: string[]): Promise<void> {
        const filtered = this.filterNames(names);
        if (!filtered.length) {
            return;
        }

        const existing = await this.geneticsRepository.find({
            where: { name: In(filtered) },
            select: ['name'],
        });
        const existingNames = new Set(existing.map((row) => {
            return row.name;
        }));
        const missing = filtered.filter((name) => {
            return !existingNames.has(name);
        });

        if (!missing.length) {
            this.logger.debug(`All ${filtered.length} genetics already exist in DB - skipping enrich.`);
            return;
        }

        this.logger.log(`Enriching ${missing.length} missing genetics via LLM in chunks of ${CHUNK_SIZE}...`);

        for (let i = 0; i < missing.length; i += CHUNK_SIZE) {
            const chunk = missing.slice(i, i + CHUNK_SIZE);
            const chunkNumber = Math.floor(i / CHUNK_SIZE) + 1;
            const totalChunks = Math.ceil(missing.length / CHUNK_SIZE);

            this.logger.log(`Searching web for genetics chunk ${chunkNumber}/${totalChunks} (${chunk.length} items)...`);

            const searchResults = await this.searchChunk(chunk);

            this.logger.log(`Sending genetics chunk ${chunkNumber}/${totalChunks} to LLM...`);

            try {
                const response = await this.llmClientService.generateResponse({
                    prompt: buildGeneticsEnrichUserPrompt(chunk, searchResults),
                    systemContext: GENETICS_ENRICH_SYSTEM_PROMPT,
                    providerOverride: 'openrouter',
                    modelOverride: 'google/gemma-4-31b-it:free',
                });

                const parsed = parseLlmJson<{ genetics?: unknown[] }>(response.content, 'genetics-enrich');
                if (!parsed || !Array.isArray(parsed.genetics)) {
                    this.logger.warn(`Failed to parse response for chunk ${chunkNumber}`);
                    continue;
                }

                const entities = parsed.genetics
                    .map((item) => {
                        return this.mapGeneticsRecord(item);
                    })
                    .filter((record): record is Partial<Genetics> => {
                        return record !== null;
                    });

                if (!entities.length) {
                    continue;
                }

                for (const entity of entities) {
                    const isDuplicate = await this.geneticsRepository.findOne({
                        where: { name: entity.name },
                    });
                    if (isDuplicate) {
                        continue;
                    }
                    await this.geneticsRepository.save(this.geneticsRepository.create(entity));
                }

                this.logger.log(`Chunk ${chunkNumber}/${totalChunks} saved successfully with ${entities.length} items.`);
            } catch (error: unknown) {
                const msg = error instanceof Error ? error.message : 'Unknown error';
                this.logger.error(`Error processing genetics chunk ${chunkNumber}: ${msg}`);
            }
        }
    }

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
            if (!/[א-ת\w]/.test(name)) {
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

    private async searchChunk(names: string[]): Promise<Map<string, string>> {
        const results = new Map<string, string>();
        for (const name of names) {
            try {
                const searchResult = await this.webSearchService.search(`${name} cannabis strain genetics parents origin`);
                if (searchResult.success && searchResult.result) {
                    const parts: string[] = [];
                    if (searchResult.result.answer) {
                        parts.push(`Answer: ${searchResult.result.answer}`);
                    }
                    for (const r of searchResult.result.results.slice(0, 3)) {
                        parts.push(`${r.title}: ${r.content}`);
                    }
                    if (parts.length > 0) {
                        results.set(name, parts.join('\n'));
                    }
                }
            } catch (error: unknown) {
                const msg = error instanceof Error ? error.message : 'Unknown error';
                this.logger.warn(`Web search failed for "${name}": ${msg}`);
            }
        }
        return results;
    }

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

        const { colorDark, colorLight } = deriveThemeColors(color);

        return {
            name,
            description: this.toNullableString(item.description),
            parent1: this.toNullableString(item.parent1),
            parent2: this.toNullableString(item.parent2),
            origin: this.toNullableString(item.origin),
            type,
            color,
            colorDark,
            colorLight,
        };
    }

    private toNullableString(value: unknown): string | null {
        if (typeof value !== 'string') {
            return null;
        }
        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : null;
    }

    async create(dto: GeneticsCreateDto): Promise<Genetics> {
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

    async update(name: string, dto: GeneticsUpdateDto): Promise<Genetics> {
        const genetics = await this.geneticsRepository.findOne({ where: { name } });
        if (!genetics) {
            throw new NotFoundException(`Genetics with name "${name}" not found`);
        }

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
``