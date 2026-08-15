import { Injectable, Logger, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
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
  DiscoveredTopic,
} from './interfaces/idea.interface';
import {
  SIGNAL_GATHERING_PROMPT,
  IDEA_GENERATION_PROMPT,
  VALIDATION_PROMPT,
  TOPIC_DISCOVERY_PROMPT,
  DISCOVERY_QUERY_GENERATION_PROMPT,
} from './constants/idea-prompts.constant';
import { SavedIdeaSession } from './entities/saved-idea-session.entity';
import { SavedIdea } from './entities/saved-idea.entity';

const MAX_DOMAIN_LENGTH = 500;
const MAX_PARALLEL_VALIDATION = 3;
const OVERALL_TIMEOUT_MS = 150_000;

@Injectable()
export class IdeasService {
  private readonly logger = new Logger(IdeasService.name);

  /**
   * Static search queries used as a fallback when the LLM fails to generate
   * current, date-aware discovery queries. Kept so the nightly cron still has
   * something to search even if the query-generation step fails.
   */
  private readonly FALLBACK_DISCOVERY_QUERIES = [
    'indie hacker pain points 2025 2026',
    'underserved SaaS niches solo founder bootstrap',
    'solo developer business ideas software only',
    'prosumer tools underserved market 2025',
  ];


  constructor(
    private readonly llm: LlmClientService,
    private readonly webSearch: WebSearchService,
    @InjectRepository(SavedIdeaSession)
    private readonly sessionRepository: Repository<SavedIdeaSession>,
    @InjectRepository(SavedIdea)
    private readonly ideaRepository: Repository<SavedIdea>,
    private readonly dataSource: DataSource,
  ) { }

  // ---------------------------------------------------------------------------
  // Persistence layer (Phase 1)
  // ---------------------------------------------------------------------------

  /**
   * Maps one generated BusinessIdea to a SavedIdea persistence row.
   * Centralized here so the field mapping exists in exactly one place.
   */
  private mapIdeaToSaved(userId: number, sessionId: number, idea: BusinessIdea): SavedIdea {
    const saved = new SavedIdea();
    saved.userId = userId;
    saved.sessionId = sessionId;
    saved.title = idea.title;
    saved.description = idea.description;
    saved.targetMarket = idea.targetMarket;
    saved.validationScore = idea.validationScore;
    saved.validationBreakdown = idea.validationBreakdown ?? null;
    saved.validationReason = idea.validationReason ?? null;
    saved.risks = idea.risks?.length ? idea.risks : null;
    saved.competitors = idea.competitors?.length ? idea.competitors : null;
    saved.nextSteps = idea.nextSteps?.length ? idea.nextSteps : null;
    saved.signalsReferenced = idea.signalsReferenced?.length ? idea.signalsReferenced : null;
    saved.techStackSuggestion = idea.techStackSuggestion ?? null;
    saved.firstDistributionStep = idea.firstDistributionStep ?? null;
    saved.estimatedMvpDays = idea.estimatedMvpDays ?? null;
    saved.groundedInSignals = idea.groundedInSignals;
    saved.isFavorite = false;
    return saved;
  }

  /**
   * Persists a full generation run (one session + all its ideas) in a single
   * transaction. Returns the new session id. Best-effort for callers — wrap in
   * try/catch at the call site and never let a save failure break the response.
   */
  async saveGeneration(
    userId: number,
    domain: string,
    provider: string | null,
    model: string | null,
    response: GenerateIdeasResponse,
    opts?: { nightly?: boolean; unread?: boolean },
  ): Promise<number> {
    const ideas = response.result ?? [];
    if (ideas.length === 0) {
      return 0;
    }

    const session = new SavedIdeaSession();
    session.userId = userId;
    session.domain = domain;
    session.provider = provider ?? null;
    session.model = model ?? null;
    session.nightly = opts?.nightly ?? false;
    session.unread = opts?.unread ?? false;

    await this.dataSource.transaction(async (manager) => {
      const savedSession = await manager.save(session);
      const savedIdeas = ideas.map((idea) => this.mapIdeaToSaved(userId, savedSession.id, idea));
      await manager.save(SavedIdea, savedIdeas);
    });

    return session.id;
  }

  /**
   * Lists the user's saved sessions (newest first). When `nightly` is true,
   * only nightly cron sessions are returned. When `favorites` is true, only
   * sessions that contain at least one favorited idea are returned.
   */
  async listSessions(
    userId: number,
    filters?: { nightly?: boolean; favorites?: boolean },
  ): Promise<SavedIdeaSession[]> {
    const qb = this.sessionRepository
      .createQueryBuilder('session')
      .loadRelationCountAndMap('session.ideasCount', 'session.ideas')
      .where('session.userId = :userId', { userId });

    if (filters?.nightly) {
      qb.andWhere('session.nightly = :nightly', { nightly: true });
    }

    if (filters?.favorites) {
      qb.andWhere(
        `session.id IN (SELECT DISTINCT idea.sessionId FROM saved_ideas idea WHERE idea.userId = :userId AND idea.isFavorite = :fav)`,
        { fav: true },
      );
    }

    qb.orderBy('session.createdAt', 'DESC');
    return qb.getMany();
  }

  /**
   * Returns one session with its ideas. Throws ForbiddenException if the session
   * does not exist or is not owned by the user.
   */
  async getSession(userId: number, sessionId: number): Promise<SavedIdeaSession> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId, userId },
      relations: ['ideas'],
    });

    if (!session) {
      throw new ForbiddenException('אינך מורשה לגשת לשמירת רעיונות זו או שהיא אינה קיימת.');
    }

    return session;
  }

  /**
   * Deletes a session and (via cascade) all its ideas. Throws ForbiddenException
   * if the session does not exist or is not owned by the user.
   */
  async deleteSession(userId: number, sessionId: number): Promise<void> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId, userId },
    });

    if (!session) {
      throw new ForbiddenException('אינך מורשה למחוק שמירת רעיונות זו או שהיא אינה קיימת.');
    }

    await this.dataSource.transaction(async (manager) => {
      await manager.delete(SavedIdeaSession, sessionId);
    });
  }

  /**
   * Toggles the favorite flag on a single idea. Ownership is enforced via the
   * idea's denormalized `userId` column (no session join needed). Throws
   * ForbiddenException if the idea does not exist or is not owned by the user.
   */
  async setFavorite(userId: number, ideaId: number, isFavorite: boolean): Promise<void> {
    const idea = await this.ideaRepository.findOne({
      where: { id: ideaId, userId },
    });

    if (!idea) {
      throw new ForbiddenException('אינך מורשה לשנות רעיון זה או שהוא אינו קיים.');
    }

    idea.isFavorite = isFavorite;
    await this.ideaRepository.save(idea);
  }

  /**
   * Counts the user's nightly sessions that have not yet been read. Drives the
   * "new ideas this morning" banner in the UI.
   */
  async unreadNightlyCount(userId: number): Promise<number> {
    return this.sessionRepository.count({
      where: { userId, nightly: true, unread: true },
    });
  }

  /**
   * Marks all of the user's unread nightly sessions as read.
   */
  async markNightlyRead(userId: number): Promise<void> {
    await this.sessionRepository.update(
      { userId, nightly: true, unread: true },
      { unread: false },
    );
  }

  async generateIdeas(
    domain: string,
    count: number,
    onProgress?: (event: IdeasProgressEvent) => void,
    userId?: number,
    providerOverride?: string,
    modelOverride?: string,
    searchQuery?: string,
  ): Promise<GenerateIdeasResponse> {
    const cleanDomain = this.sanitizeDomain(domain);
    if (!cleanDomain) {
      throw new BadRequestException('התחום ריק או מכיל תווים לא חוקיים');
    }

    const providerKey = providerOverride as LlmProvider | undefined;
    const deadline = Date.now() + OVERALL_TIMEOUT_MS;
    const searchTerm = this.sanitizeDomain(searchQuery ?? '') || cleanDomain;

    const { signals, groundedInSignals } = await this.gatherSignals(
      cleanDomain,
      searchTerm,
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
      searchTerm,
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

  /**
   * Discovers N topics/domains suitable for a solo bootstrapped developer by
   * searching the web for trends and pain points, then asking the LLM to
   * extract concrete domains. Used by the nightly cron to replace the static
   * IDEAS_NIGHTLY_DOMAINS list.
   *
   * Returns an array of `{ domain, rationale }` objects where `domain` is the
   * sanitized search term passed to `generateIdeas` and `rationale` is the
   * LLM's reasoning for why it fits a solo developer. Returns an empty array
   * on failure (caller should skip the run).
   */
  /**
   * Generates date-aware web-search queries for topic discovery by asking the
   * LLM to suggest currently hot/trending pain points instead of relying on a
   * static evergreen list. Today's date is injected into the prompt so the
   * suggestions stay current.
   *
   * @param userId - optional user id passed through to the LLM client for
   *   provider/model resolution and usage attribution.
   * @param providerOverride - optional explicit LLM provider.
   * @param modelOverride - optional explicit LLM model.
   * @returns An array of 1-6 non-empty search query strings. Falls back to
   *   {@link FALLBACK_DISCOVERY_QUERIES} if the LLM call fails or returns no
   *   usable queries, so the nightly cron never loses its search step.
   */
  private async generateDiscoveryQueries(
    userId?: number,
    providerOverride?: LlmProvider,
    modelOverride?: string,
  ): Promise<string[]> {
    const today = new Date().toISOString().slice(0, 10);
    const prompt = `Today's date: ${today}\n\nSuggest 4 specific web-search queries in English to find recent software pain points and underserved niches for solo builders. Return ONLY a JSON array of strings.`;

    try {
      const res = await this.llm.generateResponse({
        prompt,
        systemContext: DISCOVERY_QUERY_GENERATION_PROMPT,
        // הגדלת maxTokens למניעת חיתוך במודלים חינמיים/thinking
        maxTokens: 1024, // הוגדל מ-256
        userId,
        providerOverride,
        modelOverride,
      });

      const parsed = parseLlmJson<string[]>(res.content, 'discovery-query-generation');
      const queries = Array.isArray(parsed)
        ? parsed.filter((q) => typeof q === 'string' && q.trim().length > 0).slice(0, 6)
        : [];

      if (queries.length > 0) {
        return queries;
      }
    } catch (error) {
      this.logger.warn(
        `Discovery query generation failed, using fallback queries: ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }

    return this.FALLBACK_DISCOVERY_QUERIES;
  }

  async discoverTopics(
    count: number,
    userId?: number,
    providerOverride?: LlmProvider,
    modelOverride?: string,
  ): Promise<DiscoveredTopic[]> {
    const queries = await this.generateDiscoveryQueries(userId, providerOverride, modelOverride);

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
      this.logger.warn('Topic discovery: web search returned no results');
      return [];
    }

    const prompt = `תוצאות חיפוש:\n${contents.slice(0, 30).join('\n\n')}\n\nכמה נושאים לגלות: ${count}`;
    try {
      const res = await this.llm.generateResponse({
        prompt,
        systemContext: TOPIC_DISCOVERY_PROMPT,
        maxTokens: 1024,
        userId,
        providerOverride,
        modelOverride,
      });

      const parsed = parseLlmJson<{ topics: { domain: string; searchQuery?: string; rationale?: string }[] }>(
        res.content,
        'topic-discovery',
      );
      if (!parsed?.topics || !Array.isArray(parsed.topics) || parsed.topics.length === 0) {
        throw new Error('empty topics');
      }

      return parsed.topics
        .slice(0, count)
        .map((t) => ({
          domain: this.sanitizeDomain(t.domain),
          searchQuery: this.sanitizeDomain(t.searchQuery ?? '') || undefined,
          rationale: typeof t.rationale === 'string' ? t.rationale : '',
        }))
        .filter((t) => t.domain.length > 0);
    } catch (error) {
      this.logger.warn(
        `Topic discovery failed: ${error instanceof Error ? error.message : 'unknown'}`,
      );
      return [];
    }
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

  private buildSignalQueries(searchTerm: string): string[] {
    const term = searchTerm
      .replace(/[\(\)\[\]"']/g, '')
      .trim();

    return [
      `${term} pain points complaints 2025 2026`,
      `site:reddit.com ${term} missing features OR problem`,
      `best tools for ${term} alternative`,
    ];
  }

  private async gatherSignals(
    domain: string,
    searchTerm: string,
    onProgress: ((event: IdeasProgressEvent) => void) | undefined,
    deadline: number,
    userId?: number,
    providerOverride?: LlmProvider,
    modelOverride?: string,
  ): Promise<{ signals: Signal[]; groundedInSignals: boolean }> {
    onProgress?.({ phase: 0, status: 'מחפש סיגנלים בשוק...' });

    const queries = this.buildSignalQueries(searchTerm);
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
        maxTokens: 2048,
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
        maxTokens: 8192,
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
    searchTerm: string,
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
        batch.map((idea) => this.validateSingle(idea, signals, searchTerm, userId, providerOverride, modelOverride)),
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
    searchTerm: string,
    userId?: number,
    providerOverride?: LlmProvider,
    modelOverride?: string,
  ): Promise<BusinessIdea | null> {
    const competitorQuery = this.buildCompetitorQuery(idea, searchTerm);
    const searchResult = await this.webSearch.search(competitorQuery);

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
        maxTokens: 4096,
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
          riskPenalty: this.clampBreakdownScore(v.validationBreakdown.riskPenalty, 3),
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

      // Sanity check #2: אם אין תוצאות חיפוש בכלל, אל תיתן ציון competition גבוה
      if (breakdown && competitorCount === 0 && breakdown.competition >= 3) {
        this.logger.warn(
          `[SANITY] "${idea.title}": competition=${breakdown.competition} but 0 search results → clamping to 2`,
        );
        breakdown.competition = 2;
      }

      // Sanity check #3: אם כל התוצאות הן רעש (זוהה ע"י LLM ב-validationReason),
      // ודא שהציון לא מנופח
      if (breakdown && v.validationReason?.includes('לא רלוונטיות') && breakdown.competition > 2) {
        this.logger.warn(
          `[SANITY] "${idea.title}": irrelevant search results detected → clamping competition to 2`,
        );
        breakdown.competition = 2;
      }

      // Score = sum of criteria minus riskPenalty, clamped to 1-10 server-side
      // so the LLM cannot inflate it by omitting the penalty.
      const computedScore = breakdown
        ? this.clampScore(
          breakdown.competition + breakdown.signalFit + breakdown.feasibility + breakdown.marketSize - breakdown.riskPenalty,
        )
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
        techStackSuggestion: this.sanitizeOptionalText(v.techStackSuggestion),
        firstDistributionStep: this.sanitizeOptionalText(v.firstDistributionStep),
        estimatedMvpDays: this.sanitizeMvpDays(v.estimatedMvpDays),
      };
    } catch (error) {
      this.logger.warn(
        `Validation failed for "${idea.title}": ${error instanceof Error ? error.message : 'unknown'}`,
      );
      return null;
    }
  }

  private clampScore(score: number | undefined): number {
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

  /** Keeps only non-empty strings from optional LLM text fields. */
  private sanitizeOptionalText(value: unknown): string | undefined {
    if (typeof value !== 'string') {
      return undefined;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  /** Rounds the solo-dev MVP estimate and clamps it to a sane 1-365 day range. */
  private sanitizeMvpDays(value: unknown): number | undefined {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return undefined;
    }
    return Math.min(365, Math.max(1, Math.round(value)));
  }

  private sortByScore(ideas: BusinessIdea[]): BusinessIdea[] {
    return [...ideas].sort((a, b) => b.validationScore - a.validationScore);
  }

  /**
   * בונה שאילתת חיפוש מתחרים נקייה באנגלית בלבד.
   * מפרידה בין הכותרת/קהל היעד (עברית) לבין ה-searchTerm (אנגלית).
   */
  private buildCompetitorQuery(idea: RawIdea, searchTerm: string): string {
    // שלוף רק את החלק האנגלי המשמעותי מה-searchTerm
    const englishMatches = searchTerm.match(/[a-zA-Z][\w\s-]{3,}/g);
    const englishPart = englishMatches?.join(' ').trim() ?? '';

    // העדף את החלק האנגלי הנקי; fallback לכותרת (שתעבור simplifyQuery)
    const coreTerms = englishPart.length > 10 ? englishPart : idea.title;

    return `${coreTerms} software competitors alternative`;
  }
}
