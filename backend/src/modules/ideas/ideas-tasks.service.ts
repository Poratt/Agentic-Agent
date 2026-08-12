import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { IdeasService } from './ideas.service';
import { UsersService } from '../users/users.service';
import { LlmProviderService } from '../llm-provider/llm-provider.service';
import { LlmProviderConfigService } from '../llm/services/llm-provider-config.service';
import { LlmProvider } from '../llm/types/llm.types';

/**
 * Nightly ideas generation cron.
 *
 * Runs once per day (default 04:00 server time) when IDEAS_NIGHTLY_ENABLED=true.
 * Instead of reading a static domain list, the cron first discovers trending
 * topics suitable for a solo bootstrapped developer via web search + LLM
 * (the `discoverTopics` step). For each discovered topic it generates business
 * ideas and persists them as a `nightly + unread` session so they surface in
 * the ideas history / "new ideas this morning" banner on the next visit.
 *
 * No external notification channel is used — delivery is in-app (the UI pulls
 * the unread nightly sessions). Each topic is isolated in its own try/catch so
 * a single failure does not abort the rest of the batch.
 */
@Injectable()
export class IdeasTasksService {
  private readonly logger = new Logger(IdeasTasksService.name);

  constructor(
    private readonly ideasService: IdeasService,
    private readonly usersService: UsersService,
    private readonly llmProviderService: LlmProviderService,
    private readonly llmProviderConfigService: LlmProviderConfigService,
  ) {}

  @Cron('0 0 4 * * *')
  async runNightly(): Promise<void> {
    const enabled = process.env.IDEAS_NIGHTLY_ENABLED === 'true';
    if (!enabled) {
      this.logger.log('Nightly ideas generation disabled (IDEAS_NIGHTLY_ENABLED !== "true"), skipping');
      return;
    }

    const admin = await this.usersService.findFirstAdmin();
    if (!admin) {
      this.logger.warn('Nightly ideas generation skipped: no admin user found');
      return;
    }

    const model = await this.resolveModel();
    if (!model) {
      this.logger.warn('Nightly ideas generation skipped: no active text-capable model available');
      return;
    }

    const count = Number(process.env.IDEAS_NIGHTLY_COUNT ?? 5);
    const topicCount = Number(process.env.IDEAS_NIGHTLY_TOPIC_COUNT ?? 3);

    // --- Discovery step ---
    this.logger.log(`Discovering ${topicCount} topics for nightly ideas generation`);
    const topics = await this.ideasService.discoverTopics(
      topicCount,
      admin.id,
      model.provider as LlmProvider,
      model.model,
    );

    if (topics.length === 0) {
      this.logger.warn('Nightly ideas generation skipped: topic discovery returned 0 topics');
      return;
    }

    this.logger.log(`Discovered ${topics.length} topic(s): ${topics.map((t) => t.domain).join(', ')}`);

    // --- Generation step ---
    for (const topic of topics) {
      try {
        const res = await this.ideasService.generateIdeas(
          topic.domain,
          count,
          undefined,
          admin.id,
          model.provider as LlmProvider,
          model.model,
        );
        await this.ideasService.saveGeneration(admin.id, topic.domain, model.provider, model.model, res, {
          nightly: true,
          unread: true,
        });
        this.logger.log(`Nightly ideas generation succeeded for domain "${topic.domain}" (rationale: ${topic.rationale}) — ${res.result?.length ?? 0} ideas`);
      } catch (e) {
        this.logger.error(`Nightly ideas generation failed for domain "${topic.domain}" (rationale: ${topic.rationale})`, e);
      }
    }
    this.logger.log('Nightly ideas generation finished');
  }

  /**
   * Resolves the model to use for nightly runs, in order of preference:
   * 1. IDEAS_NIGHTLY_MODEL env override ("provider/model")
   * 2. DB-stored first active text-capable model
   * 3. AI_PROVIDER env fallback (via LlmProviderConfigService)
   */
  private async resolveModel(): Promise<{ provider: string; model: string } | null> {
    // 1. Explicit env override
    const override = process.env.IDEAS_NIGHTLY_MODEL;
    if (override && override.includes('/')) {
      const [provider, model] = override.split('/', 2);
      return { provider, model };
    }

    // 2. First active text model from DB
    const dbModel = await this.llmProviderService.findFirstActiveTextModel();
    if (dbModel) return dbModel;

    // 3. AI_PROVIDER env fallback
    try {
      const provider = this.llmProviderConfigService.getActiveProvider();
      const model = this.llmProviderConfigService.getActiveModel();
      return { provider, model };
    } catch {
      return null;
    }
  }
}
