import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { IdeasService } from './ideas.service';
import { UsersService } from '../users/users.service';
import { LlmProviderService } from '../llm-provider/llm-provider.service';

/**
 * Nightly ideas generation cron.
 *
 * Runs once per day (default 04:00 server time) when IDEAS_NIGHTLY_ENABLED=true.
 * For each domain in IDEAS_NIGHTLY_DOMAINS it generates business ideas for the
 * admin user and persists them as a `nightly + unread` session so they surface
 * in the ideas history / "new ideas this morning" banner on the next visit.
 *
 * No external notification channel is used — delivery is in-app (the UI pulls
 * the unread nightly sessions). Each domain is isolated in its own try/catch so
 * a single failure does not abort the rest of the batch.
 */
@Injectable()
export class IdeasTasksService {
  private readonly logger = new Logger(IdeasTasksService.name);

  constructor(
    private readonly ideasService: IdeasService,
    private readonly usersService: UsersService,
    private readonly llmProviderService: LlmProviderService,
  ) {}

  @Cron('0 0 4 * * *')
  async runNightly(): Promise<void> {
    // Read the env flag at run time so a config change takes effect on the next
    // cron tick without a process restart, and so tests can set the flag before
    // each run instead of before module construction.
    const enabled = process.env.IDEAS_NIGHTLY_ENABLED === 'true';
    if (!enabled) {
      this.logger.log('Nightly ideas generation disabled (IDEAS_NIGHTLY_ENABLED !== "true"), skipping');
      return;
    }

    const domains = (process.env.IDEAS_NIGHTLY_DOMAINS ?? '')
      .split(';')
      .map((s) => s.trim())
      .filter(Boolean);
    if (domains.length === 0) {
      this.logger.warn('Nightly ideas generation skipped: IDEAS_NIGHTLY_DOMAINS is empty');
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

    this.logger.log(`Starting nightly ideas generation for ${domains.length} domain(s) as user ${admin.id}`);
    for (const domain of domains) {
      try {
        const res = await this.ideasService.generateIdeas(
          domain,
          count,
          undefined,
          admin.id,
          model.provider,
          model.model,
        );
        await this.ideasService.saveGeneration(admin.id, domain, model.provider, model.model, res, {
          nightly: true,
          unread: true,
        });
        this.logger.log(`Nightly ideas generation succeeded for domain "${domain}" (${res.result?.length ?? 0} ideas)`);
      } catch (e) {
        this.logger.error(`Nightly ideas generation failed for domain "${domain}"`, e);
      }
    }
    this.logger.log('Nightly ideas generation finished');
  }

  /**
   * Resolves the model to use for nightly runs. Prefers the IDEAS_NIGHTLY_MODEL
   * env override ("provider/model"); otherwise falls back to the first active
   * text-capable model (same path the chat uses for its default). Never relies
   * on a per-request/user context.
   */
  private async resolveModel(): Promise<{ provider: string; model: string } | null> {
    const override = process.env.IDEAS_NIGHTLY_MODEL;
    if (override && override.includes('/')) {
      const [provider, model] = override.split('/', 2);
      return { provider, model };
    }
    return this.llmProviderService.findFirstActiveTextModel();
  }
}
