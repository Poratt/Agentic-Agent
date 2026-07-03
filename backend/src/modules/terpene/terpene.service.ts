import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Terpene } from './entities/terpene.entity';
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
const CHUNK_SIZE = 15;

@Injectable()
export class TerpeneService {
    private readonly logger = new Logger(TerpeneService.name);

    constructor(
        @InjectRepository(Terpene)
        private readonly terpeneRepository: Repository<Terpene>,
        private readonly llmClientService: LlmClientService,
    ) { }

    async findAll(): Promise<Terpene[]> {
        return this.terpeneRepository.find({ order: { name: 'ASC' } });
    }

    async findByName(name: string): Promise<Terpene | null> {
        return this.terpeneRepository.findOne({ where: { name } });
    }

    async create(dto: TerpeneCreateDto): Promise<Terpene> {
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

    async update(name: string, dto: TerpeneUpdateDto): Promise<Terpene> {
        const terpene = await this.terpeneRepository.findOne({ where: { name } });
        if (!terpene) {
            throw new NotFoundException(`Terpene with name "${name}" not found`);
        }

        Object.assign(terpene, {
            ...dto,
            description: dto.description ?? terpene.description,
            scent: dto.scent ?? terpene.scent,
            effects: dto.effects !== undefined ? dto.effects : terpene.effects,
            color: dto.color ?? terpene.color,
        });

        return this.terpeneRepository.save(terpene);
    }

    async enrichBatch(names: string[]): Promise<void> {
        const filtered = this.filterNames(names);
        if (!filtered.length) {
            return;
        }

        const existing = await this.terpeneRepository.find({
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
            this.logger.debug(`All ${filtered.length} terpenes already exist in DB - skipping enrich.`);
            return;
        }

        this.logger.log(`Enriching ${missing.length} missing terpenes via LLM in chunks of ${CHUNK_SIZE}...`);

        for (let i = 0; i < missing.length; i += CHUNK_SIZE) {
            const chunk = missing.slice(i, i + CHUNK_SIZE);
            const chunkNumber = Math.floor(i / CHUNK_SIZE) + 1;
            const totalChunks = Math.ceil(missing.length / CHUNK_SIZE);

            this.logger.log(`Sending terpenes chunk ${chunkNumber}/${totalChunks} (${chunk.length} items)...`);

            try {
                const response = await this.llmClientService.generateResponse({
                    prompt: buildTerpeneEnrichUserPrompt(chunk),
                    systemContext: TERPENE_ENRICH_SYSTEM_PROMPT,
                    providerOverride: 'openrouter',
                    modelOverride: 'google/gemma-4-31b-it:free',
                });

                const parsed = parseLlmJson<{ terpenes?: unknown[] }>(response.content, 'terpene-enrich');
                if (!parsed || !Array.isArray(parsed.terpenes)) {
                    this.logger.warn(`Failed to parse response for chunk ${chunkNumber}`);
                    continue;
                }

                const entities = parsed.terpenes
                    .map((item) => {
                        return this.mapTerpeneRecord(item);
                    })
                    .filter((record): record is Partial<Terpene> => {
                        return record !== null;
                    });

                if (!entities.length) {
                    continue;
                }

                for (const entity of entities) {
                    const isDuplicate = await this.terpeneRepository.findOne({
                        where: { name: entity.name },
                    });
                    if (isDuplicate) {
                        continue;
                    }
                    await this.terpeneRepository.save(this.terpeneRepository.create(entity));
                }

                this.logger.log(`Chunk ${chunkNumber}/${totalChunks} saved successfully with ${entities.length} items.`);
            } catch (error: unknown) {
                const msg = error instanceof Error ? error.message : 'Unknown error';
                this.logger.error(`Error processing terpenes chunk ${chunkNumber}: ${msg}`);
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

    private parseEffects(value: unknown): string[] | null {
        if (typeof value !== 'string') {
            return null;
        }
        const effects = value
            .split(',')
            .map((entry) => {
                return entry.trim();
            })
            .filter((entry) => {
                return entry.length > 0;
            });
        return effects.length > 0 ? effects : null;
    }

    private toNullableString(value: unknown): string | null {
        if (typeof value !== 'string') {
            return null;
        }
        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : null;
    }
}