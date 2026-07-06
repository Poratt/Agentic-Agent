import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
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
import { CannlyticsService } from '../cannlytics/cannlytics.service';

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
        private readonly cannlyticsService: CannlyticsService,
        private readonly httpService: HttpService,
    ) { }

    async findAll(): Promise<Genetics[]> {
        return this.geneticsRepository.find({ order: { name: 'ASC' } });
    }

    async findByName(name: string): Promise<Genetics | null> {
        return this.geneticsRepository.findOne({ where: { name } });
    }

    async delete(name: string): Promise<void> {
        const result = await this.geneticsRepository.delete({ name });
        if (result.affected === 0) {
            throw new NotFoundException(`Genetics "${name}" not found`);
        }
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

            this.logger.log(`Fetching Demarily data for genetics chunk ${chunkNumber}/${totalChunks}...`);
            const demarilyResults = await this.fetchDemarilyChunk(chunk);

            // Merge Demarily data into search results for LLM prompt
            const enrichedSearchResults = new Map(searchResults);
            for (const [name, demarilyData] of demarilyResults) {
                const existing = enrichedSearchResults.get(name) || '';
                enrichedSearchResults.set(name, existing ? `Strain database:\n${demarilyData}\n\nWeb search:\n${existing}` : `Strain database:\n${demarilyData}`);
            }

            this.logger.log(`Sending genetics chunk ${chunkNumber}/${totalChunks} to LLM...`);
            const userPrompt = buildGeneticsEnrichUserPrompt(chunk, enrichedSearchResults);
            this.logger.debug(`[enrichBatch] LLM prompt for chunk ${chunkNumber}:\n${userPrompt}`);

            try {
                const response = await this.llmClientService.generateResponse({
                    prompt: userPrompt,
                    systemContext: GENETICS_ENRICH_SYSTEM_PROMPT,
                    providerOverride: 'openrouter',
                    modelOverride: 'google/gemma-4-31b-it:free',
                    maxTokens: 4096,
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

    async enrichMissing(): Promise<{ total: number; enriched: number; errors: number }> {
        const rows = await this.geneticsRepository.find({
            where: [
                { thcRange: IsNull() },
                { terpenes: IsNull() },
                { effects: IsNull() },
            ],
            order: { name: 'ASC' },
        });

        if (!rows.length) {
            this.logger.log('[enrichMissing] All genetics have complete data — nothing to do.');
            return { total: 0, enriched: 0, errors: 0 };
        }

        this.logger.log(`[enrichMissing] Found ${rows.length} genetics with missing data. Enriching in chunks of ${CHUNK_SIZE}...`);

        let enriched = 0;
        let errors = 0;

        for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
            const chunk = rows.slice(i, i + CHUNK_SIZE);
            const names = chunk.map((r) => r.name);
            const chunkNumber = Math.floor(i / CHUNK_SIZE) + 1;
            const totalChunks = Math.ceil(rows.length / CHUNK_SIZE);

            this.logger.log(`[enrichMissing] Fetching Cannlytics data for chunk ${chunkNumber}/${totalChunks}...`);
            const cannlyticsResults = await this.fetchCannlyticsChunk(names);

            this.logger.log(`[enrichMissing] Fetching Demarily data for chunk ${chunkNumber}/${totalChunks}...`);
            const demarilyResults = await this.fetchDemarilyChunk(names);

            this.logger.log(`[enrichMissing] Searching web for chunk ${chunkNumber}/${totalChunks} (${chunk.length} items)...`);
            const searchResults = await this.searchChunk(names);

            // Combine Cannlytics, Demarily, and web search results
            const combinedResults = new Map<string, string>();
            for (const name of names) {
                const parts: string[] = [];
                const cannlytics = cannlyticsResults.get(name);
                const demarily = demarilyResults.get(name);
                const search = searchResults.get(name);
                if (demarily) parts.push(`Strain database:\n${demarily}`);
                if (cannlytics) parts.push(`Lab data:\n${cannlytics}`);
                if (search) parts.push(`Web search:\n${search}`);
                if (parts.length > 0) {
                    combinedResults.set(name, parts.join('\n\n'));
                }
            }

            this.logger.log(`[enrichMissing] Sending chunk ${chunkNumber}/${totalChunks} to LLM...`);
            const userPrompt = buildGeneticsEnrichUserPrompt(names, combinedResults);
            this.logger.debug(`[enrichMissing] LLM prompt for chunk ${chunkNumber}:\n${userPrompt}`);
            try {
                const response = await this.llmClientService.generateResponse({
                    prompt: userPrompt,
                    systemContext: GENETICS_ENRICH_SYSTEM_PROMPT,
                    providerOverride: 'openrouter',
                    modelOverride: 'google/gemma-4-31b-it:free',
                    maxTokens: 4096,
                });

                const parsed = parseLlmJson<{ genetics?: unknown[] }>(response.content, 'genetics-enrich-missing');
                if (!parsed || !Array.isArray(parsed.genetics)) {
                    this.logger.warn(`[enrichMissing] Failed to parse chunk ${chunkNumber}`);
                    errors += chunk.length;
                    continue;
                }

                for (const item of parsed.genetics) {
                    const record = this.mapGeneticsRecord(item);
                    if (!record?.name) {
                        errors++;
                        continue;
                    }
                    const existing = await this.geneticsRepository.findOne({ where: { name: record.name } });
                    if (!existing) {
                        this.logger.warn(`[enrichMissing] Record not found in DB: "${record.name}"`);
                        errors++;
                        continue;
                    }
                    await this.geneticsRepository.update(existing.id, {
                        ...(record.description && { description: record.description }),
                        ...(record.parent1 && { parent1: record.parent1 }),
                        ...(record.parent2 && { parent2: record.parent2 }),
                        ...(record.origin && { origin: record.origin }),
                        ...(record.type && { type: record.type }),
                        ...(record.thcRange && { thcRange: record.thcRange }),
                        ...(record.terpenes && { terpenes: record.terpenes }),
                        ...(record.effects && { effects: record.effects }),
                        ...(record.color && { color: record.color }),
                        ...(record.colorDark && { colorDark: record.colorDark }),
                        ...(record.colorLight && { colorLight: record.colorLight }),
                    });
                    enriched++;
                }

                this.logger.log(`[enrichMissing] Chunk ${chunkNumber}/${totalChunks} done — ${enriched} enriched so far.`);
            } catch (error: unknown) {
                const msg = error instanceof Error ? error.message : 'Unknown error';
                this.logger.error(`[enrichMissing] Error processing chunk ${chunkNumber}: ${msg}`);
                errors += chunk.length;
            }
        }

        this.logger.log(`[enrichMissing] Finished: ${enriched} enriched, ${errors} errors out of ${rows.length} total.`);
        return { total: rows.length, enriched, errors };
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
                const englishName = this.cannlyticsService.getEnglishName(name) || name;
                const searchQuery = englishName !== name
                    ? `${englishName} (${name}) cannabis strain genetics parents origin`
                    : `${name} cannabis strain genetics parents origin`;
                const searchResult = await this.webSearchService.search(searchQuery);
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

    private async fetchCannlyticsChunk(names: string[]): Promise<Map<string, string>> {
        const results = new Map<string, string>();
        for (const name of names) {
            try {
                const data = await this.cannlyticsService.getStrain(name);
                if (data) {
                    const formatted = this.cannlyticsService.formatForEnrichment(data);
                    results.set(name, formatted);
                }
            } catch (error: unknown) {
                const msg = error instanceof Error ? error.message : 'Unknown error';
                this.logger.warn(`Cannlytics fetch failed for "${name}": ${msg}`);
            }
        }
        return results;
    }

    private async fetchDemarilyChunk(names: string[]): Promise<Map<string, string>> {
        const results = new Map<string, string>();
        for (const name of names) {
            try {
                // Translate Hebrew name to English for API search
                const englishName = this.cannlyticsService.getEnglishName(name) || name;
                const response = await firstValueFrom(
                    this.httpService.get(`https://budprofiles.com/api/v1/strains`, {
                        params: { q: englishName, limit: 1 },
                        timeout: 10000,
                    }),
                );
                const strains = response.data?.data;
                if (strains?.length > 0) {
                    const strain = strains[0];
                    const effects = strain.effects?.join(', ') || '';
                    const flavors = strain.flavors?.join(', ') || '';
                    const terpenes = strain.terpenes?.map((t: { name: string; percentage?: number }) =>
                        t.percentage ? `${t.name} (${t.percentage}%)` : t.name
                    ).join(', ') || '';
                    const parts = [
                        strain.description && `Description: ${strain.description}`,
                        strain.thc && `THC: ${strain.thc}%`,
                        strain.type && `Type: ${strain.type}`,
                        effects && `Effects: ${effects}`,
                        flavors && `Flavors: ${flavors}`,
                        terpenes && `Terpenes: ${terpenes}`,
                        strain.lineage && `Lineage: ${strain.lineage}`,
                    ].filter(Boolean);
                    if (parts.length > 0) {
                        results.set(name, parts.join('\n'));
                    }
                }
            } catch (error: unknown) {
                const msg = error instanceof Error ? error.message : 'Unknown error';
                this.logger.warn(`BudProfiles fetch failed for "${name}": ${msg}`);
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
            thcRange: this.toNullableString(item.thcRange),
            terpenes: this.toNullableString(item.terpenes),
            effects: this.toNullableString(item.effects),
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
            thcRange: dto.thcRange !== undefined ? dto.thcRange : genetics.thcRange,
            terpenes: dto.terpenes !== undefined ? dto.terpenes : genetics.terpenes,
            effects: dto.effects !== undefined ? dto.effects : genetics.effects,
            color: dto.color ?? genetics.color,
        });

        return this.geneticsRepository.save(genetics);
    }

    async enrichSingle(name: string): Promise<{
        name: string;
        description: string | null;
        parent1: string | null;
        parent2: string | null;
        origin: string | null;
        type: string | null;
        thcRange: string | null;
        terpenes: string | null;
        effects: string | null;
        color: string;
        colorDark: string;
        colorLight: string;
    } | null> {
        // Try Cannlytics API first for lab data
        const cannlyticsData = await this.cannlyticsService.getStrain(name);
        let cannlyticsContext = '';
        
        if (cannlyticsData) {
            cannlyticsContext = this.cannlyticsService.formatForEnrichment(cannlyticsData);
            this.logger.debug(`[enrichSingle] Cannlytics data for "${name}":\n${cannlyticsContext}`);
        }

        // Try Demarily API for strain database data
        const demarilyResults = await this.fetchDemarilyChunk([name]);
        const demarilyContext = demarilyResults.get(name) || '';
        if (demarilyContext) {
            this.logger.debug(`[enrichSingle] Demarily data for "${name}":\n${demarilyContext}`);
        }

        // Also get web search results for description/origin/parents
        const englishName = this.cannlyticsService.getEnglishName(name);
        const searchQuery = englishName
            ? `${englishName} (${name}) cannabis strain genetics description parents origin`
            : `${name} cannabis strain genetics description parents origin`;
        const searchResult = await this.webSearchService.search(searchQuery);

        let searchContext = '';
        if (searchResult.success && searchResult.result) {
            const parts: string[] = [];
            if (searchResult.result.answer) {
                parts.push(`Answer: ${searchResult.result.answer}`);
            }
            for (const r of searchResult.result.results.slice(0, 3)) {
                parts.push(`${r.title}: ${r.content}`);
            }
            searchContext = parts.join('\n');
        }

        this.logger.debug(`[enrichSingle] Search context for "${name}":\n${searchContext || '(empty)'}`);

        // Build combined context
        const combinedContext = [
            demarilyContext ? `Strain database (use this for effects, flavors, terpenes, THC):\n${demarilyContext}` : '',
            cannlyticsContext ? `Lab data from Cannlytics (use this for THC, terpenes, aromas):\n${cannlyticsContext}` : '',
            searchContext ? `Web search results:\n${searchContext}` : '',
        ].filter(Boolean).join('\n\n');

        const prompt = `Enrich cannabis strain "${name}"${englishName ? ` (English name: ${englishName})` : ''}.
${combinedContext || 'No external data available.'}

${cannlyticsData ? 'Use the Cannlytics lab data above for accurate THC%, terpene names and percentages.' : 'Use web search or your knowledge for THC and terpenes.'}
Use web search for description, parents, origin, and type.
Return JSON only:
{"genetics":[{"name":"${name}","description":"3-5 sentences in Hebrew covering origin, effects, flavor, medical uses","parent1":"parent or null","parent2":"parent or null","origin":"country in Hebrew","type":"היברידי/סאטיבה/אינדיקה","thcRange":"15-21%","terpenes":"Caryophyllene, Limonene","effects":"מרגיעה, מרדימה","color":"#hex"}]}`;

        const response = await this.llmClientService.generateResponse({
            prompt,
            systemContext: GENETICS_ENRICH_SYSTEM_PROMPT,
            providerOverride: 'openrouter',
            modelOverride: 'google/gemma-4-31b-it:free',
            maxTokens: 4096,
        });

        this.logger.debug(`[enrichSingle] Raw LLM response (${response.content?.length} chars): ${response.content?.slice(0, 200)}`);

        const parsed = parseLlmJson<{ genetics?: Record<string, unknown>[] }>(response.content, 'genetics-enrich-single');
        if (!parsed?.genetics?.[0]) return null;

        const item = parsed.genetics[0];
        const color = typeof item.color === 'string' && HEX_COLOR_REGEX.test(item.color.trim())
            ? item.color.trim()
            : DEFAULT_COLOR;
        const { colorDark, colorLight } = deriveThemeColors(color);

        return {
            name,
            description: this.toNullableString(item.description),
            parent1: this.toNullableString(item.parent1),
            parent2: this.toNullableString(item.parent2),
            origin: this.toNullableString(item.origin),
            type: typeof item.type === 'string' && VALID_TYPES.has(item.type.trim()) ? item.type.trim() : null,
            thcRange: this.toNullableString(item.thcRange),
            terpenes: this.toNullableString(item.terpenes),
            effects: this.toNullableString(item.effects),
            color,
            colorDark,
            colorLight,
        };
    }
}
``