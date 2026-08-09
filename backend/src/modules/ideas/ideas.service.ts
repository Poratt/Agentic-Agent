import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { LlmClientService } from '../llm/services/llm-client.service';
import { WebSearchService } from '../web-search/web-search.service';
import { parseLlmJson } from '../llm/utils/llm-json-parser';
import { LlmProvider } from '../llm/types/llm.types';
import {
  Signal,
  RawIdea,
  ValidationResult,
  ValidationBreakdown,
  BusinessIdea,
  GenerateIdeasResponse,
  IdeasProgressEvent,
} from './interfaces/idea.interface';
import {
  SIGNAL_GATHERING_PROMPT,
  IDEA_GENERATION_PROMPT,
  VALIDATION_PROMPT,
} from './constants/idea-prompts.constant';

const MAX_DOMAIN_LENGTH = 500;
const MAX_PARALLEL_VALIDATION = 3;
const OVERALL_TIMEOUT_MS = 60_000;

@Injectable()
export class IdeasService {
  private readonly logger = new Logger(IdeasService.name);

  constructor(
    private readonly llm: LlmClientService,
    private readonly webSearch: WebSearchService,
  ) {}

  async generateIdeas(
    domain: string,
    count: number,
    onProgress?: (event: IdeasProgressEvent) => void,
    userId?: number,
    providerOverride?: string,
    modelOverride?: string,
  ): Promise<GenerateIdeasResponse> {
    const cleanDomain = this.sanitizeDomain(domain);
    if (!cleanDomain) {
      throw new BadRequestException('התחום ריק או מכיל תווים לא חוקיים');
    }

    const providerKey = providerOverride as LlmProvider | undefined;
    const deadline = Date.now() + OVERALL_TIMEOUT_MS;

    const { signals, groundedInSignals } = await this.gatherSignals(
      cleanDomain,
      onProgress,
      deadline,
      userId,
      providerKey,
      modelOverride,
    );

    onProgress?.({ phase: 1, status: 'מייצר רעיונות...' });
    const rawIdeas = await this.generateIdeasFromSignals(cleanDomain, signals, count, userId, providerKey, modelOverride);

    onProgress?.({ phase: 2, status: 'מאמת מול מתחרים...' });
    const { ideas, failedCount } = await this.validateIdeas(
      rawIdeas,
      signals,
      onProgress,
      deadline,
      userId,
      providerKey,
      modelOverride,
    );

    const partial = failedCount > 0 || !groundedInSignals;
    const result = this.sortByScore(ideas);

    const message = !groundedInSignals
      ? 'נוצרו רעיונות ללא עיגון במחקר שוק — התוצאות עשויות להיות פחות מבוססות'
      : `נוצרו ${result.length} רעיונות עבור "${cleanDomain}"`;

    const response: GenerateIdeasResponse = {
      success: true,
      message,
      partial,
      result,
      ...(failedCount > 0 ? { failedCount } : {}),
    };

    onProgress?.({ phase: 'done', result: response });
    return response;
  }

  private sanitizeDomain(domain: string): string {
    const collapsed = domain.trim().replace(/\s+/g, ' ');
    const stripped = collapsed
      .replace(/[`<>"]/g, '')
      .replace(/[\r\n]/g, ' ')
      .trim();

    if (stripped.length > MAX_DOMAIN_LENGTH) {
      return '';
    }
    return stripped;
  }

  private buildSignalQueries(domain: string): string[] {
    return [
      `pain points in ${domain} 2024 2025`,
      `trends in ${domain} market gaps`,
      `challenges ${domain} freelancers businesses`,
    ];
  }

  private async gatherSignals(
    domain: string,
    onProgress: ((event: IdeasProgressEvent) => void) | undefined,
    deadline: number,
    userId?: number,
    providerOverride?: LlmProvider,
    modelOverride?: string,
  ): Promise<{ signals: Signal[]; groundedInSignals: boolean }> {
    onProgress?.({ phase: 0, status: 'מחפש סיגנלים בשוק...' });

    const queries = this.buildSignalQueries(domain);
    const settled = await Promise.allSettled(
      queries.map((q) => this.webSearch.search(q)),
    );

    const contents: string[] = [];
    for (const s of settled) {
      if (s.status === 'fulfilled' && s.value.success && s.value.result) {
        for (const r of s.value.result.results) {
          contents.push(`${r.title}: ${r.content}`);
        }
      }
    }

    if (contents.length === 0) {
      this.logger.warn('Signal gathering returned no search results — fallback mode');
      return { signals: [], groundedInSignals: false };
    }

    const prompt = `תחום: ${domain}\n\nתוצאות חיפוש:\n${contents.slice(0, 20).join('\n\n')}`;
    try {
      const res = await this.llm.generateResponse({
        prompt,
        systemContext: SIGNAL_GATHERING_PROMPT,
        maxTokens: 1024,
        userId,
        providerOverride,
        modelOverride,
      });

      // RAW DEBUG LOG
      this.logger.log(`[SIGNALS RAW] finish_reason=${res.finishReason} content_length=${res.content?.length ?? 0}`);
      if (!res.content || res.content.length === 0) {
        this.logger.warn(`[SIGNALS RAW] EMPTY content — rawCompletion=${JSON.stringify(res.rawCompletion).slice(0, 500)}`);
      } else {
        this.logger.log(`[SIGNALS RAW] content=${res.content.slice(0, 300)}`);
      }

      const signals = parseLlmJson<Signal[]>(res.content, 'ideas-signals');
      if (!signals || !Array.isArray(signals) || signals.length === 0) {
        throw new Error('empty signals');
      }
      return { signals, groundedInSignals: true };
    } catch (error) {
      this.logger.warn(
        `Signal extraction failed — fallback mode: ${error instanceof Error ? error.message : 'unknown'}`,
      );
      return { signals: [], groundedInSignals: false };
    }
  }

  private async generateIdeasFromSignals(
    domain: string,
    signals: Signal[],
    count: number,
    userId?: number,
    providerOverride?: LlmProvider,
    modelOverride?: string,
  ): Promise<RawIdea[]> {
    const signalsText = signals.length
      ? signals.map((s) => `- ${s.signal} (מקור: ${s.source})`).join('\n')
      : '(ללא סיגנלים — השתמש בידע הכללי שלך)';

    const prompt = `תחום: ${domain}\nמספר רעיונות נדרש: ${count}\n\nסיגנלים:\n${signalsText}`;
    try {
      const res = await this.llm.generateResponse({
        prompt,
        systemContext: IDEA_GENERATION_PROMPT,
        maxTokens: 2048,
        userId,
        providerOverride,
        modelOverride,
      });
      const ideas = parseLlmJson<RawIdea[]>(res.content, 'ideas-generation');
      if (!ideas || !Array.isArray(ideas)) {
        throw new Error('invalid ideas JSON');
      }
      return ideas.slice(0, count);
    } catch (error) {
      this.logger.error(
        `Idea generation failed: ${error instanceof Error ? error.message : 'unknown'}`,
      );
      return [];
    }
  }

  private async validateIdeas(
    rawIdeas: RawIdea[],
    signals: Signal[],
    onProgress: ((event: IdeasProgressEvent) => void) | undefined,
    deadline: number,
    userId?: number,
    providerOverride?: LlmProvider,
    modelOverride?: string,
  ): Promise<{ ideas: BusinessIdea[]; failedCount: number }> {
    if (rawIdeas.length === 0) {
      return { ideas: [], failedCount: 0 };
    }

    const batches: RawIdea[][] = [];
    for (let i = 0; i < rawIdeas.length; i += MAX_PARALLEL_VALIDATION) {
      batches.push(rawIdeas.slice(i, i + MAX_PARALLEL_VALIDATION));
    }

    const ideas: BusinessIdea[] = [];
    let failedCount = 0;
    let globalIndex = 0;

    for (const batch of batches) {
      if (Date.now() > deadline) {
        failedCount += batch.length;
        break;
      }

      const settled = await Promise.allSettled(
        batch.map((idea) => this.validateSingle(idea, signals, userId, providerOverride, modelOverride)),
      );

      for (const s of settled) {
        if (s.status === 'fulfilled' && s.value) {
          ideas.push(s.value);
          onProgress?.({
            phase: 2,
            status: 'מאמת מול מתחרים...',
            ideaIndex: globalIndex,
            idea: s.value,
          });
        } else {
          failedCount += 1;
        }
        globalIndex += 1;
      }
    }

    return { ideas, failedCount };
  }

  private async validateSingle(
    idea: RawIdea,
    signals: Signal[],
    userId?: number,
    providerOverride?: LlmProvider,
    modelOverride?: string,
  ): Promise<BusinessIdea | null> {
    const searchResult = await this.webSearch.search(
      `competitors for ${idea.title} ${idea.targetMarket}`,
    );

    const searchResults = searchResult.success && searchResult.result
      ? searchResult.result.results
      : [];

    const competitorCount = searchResults.length;

    const searchText = searchResults
      .map((r) => `${r.title}: ${r.content}`)
      .slice(0, 10)
      .join('\n\n') || '(ללא תוצאות חיפוש)';

    const signalsText = signals.length
      ? signals.map((s) => `- ${s.signal}`).join('\n')
      : '(ללא סיגנלים)';

    const prompt = `רעיון:\nכותרת: ${idea.title}\nתיאור: ${idea.description}\nקהל יעד: ${idea.targetMarket}\n\nתוצאות חיפוש מתחרים (${competitorCount} תוצאות):\n${searchText}\n\nסיגנלים:\n${signalsText}`;

    try {
      const res = await this.llm.generateResponse({
        prompt,
        systemContext: VALIDATION_PROMPT,
        maxTokens: 3072,
        userId,
        providerOverride,
        modelOverride,
      });

      // RAW DEBUG LOG
      this.logger.log(`[VALIDATION RAW] idea="${idea.title}" finish_reason=${res.finishReason} content_length=${res.content?.length ?? 0}`);
      if (res.content && res.content.length > 0) {
        this.logger.log(`[VALIDATION RAW] content=${res.content}`);
      } else {
        this.logger.warn(`[VALIDATION RAW] EMPTY content — rawCompletion=${JSON.stringify(res.rawCompletion).slice(0, 500)}`);
      }

      const v = parseLlmJson<ValidationResult>(res.content, 'ideas-validation');
      if (!v) {
        throw new Error('invalid validation JSON');
      }

      const breakdown: ValidationBreakdown | undefined = v.validationBreakdown
        ? {
            competition: this.clampBreakdownScore(v.validationBreakdown.competition, 3),
            signalFit: this.clampBreakdownScore(v.validationBreakdown.signalFit, 3),
            feasibility: this.clampBreakdownScore(v.validationBreakdown.feasibility, 2),
            marketSize: this.clampBreakdownScore(v.validationBreakdown.marketSize, 2),
          }
        : undefined;

      // Sanity check: if competition=3 (no competitors) but competitors list is not empty → clamp down
      const competitors = v.competitors ?? [];
      if (breakdown && breakdown.competition === 3 && competitors.length > 0) {
        this.logger.warn(
          `[SANITY] "${idea.title}": competition=3 but ${competitors.length} competitors found → clamping to ${Math.min(2, competitors.length)} `,
        );
        breakdown.competition = Math.min(2, competitors.length);
      }

      const computedScore = breakdown
        ? breakdown.competition + breakdown.signalFit + breakdown.feasibility + breakdown.marketSize
        : this.clampScore(v.validationScore);

      return {
        title: idea.title,
        description: idea.description,
        targetMarket: idea.targetMarket,
        validationScore: computedScore,
        validationBreakdown: breakdown,
        validationReason: v.validationReason ?? '',
        risks: v.risks ?? [],
        competitors,
        nextSteps: v.nextSteps ?? [],
        signalsReferenced: v.signalsReferenced ?? [],
        groundedInSignals: signals.length > 0,
      };
    } catch (error) {
      this.logger.warn(
        `Validation failed for "${idea.title}": ${error instanceof Error ? error.message : 'unknown'}`,
      );
      return null;
    }
  }

  private clampScore(score: number): number {
    if (typeof score !== 'number' || Number.isNaN(score)) {
      return 1;
    }
    return Math.min(10, Math.max(1, Math.round(score)));
  }

  private clampBreakdownScore(score: number, max: number): number {
    if (typeof score !== 'number' || Number.isNaN(score)) {
      return 0;
    }
    return Math.min(max, Math.max(0, Math.round(score)));
  }

  private sortByScore(ideas: BusinessIdea[]): BusinessIdea[] {
    return [...ideas].sort((a, b) => b.validationScore - a.validationScore);
  }
}
