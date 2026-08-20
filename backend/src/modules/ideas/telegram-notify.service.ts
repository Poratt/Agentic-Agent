import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import type { DiscoveredTopic, GenerateIdeasResponse } from './interfaces/idea.interface';
import { translationTracker } from '../../core/services/translation-tracker';

const TELEGRAM_API = 'https://api.telegram.org';
const MAX_MESSAGE_CHARS = 4000;
const MAX_IDEAS_PER_DOMAIN = 5;
const MAX_DESCRIPTION_CHARS = 100;
const MAX_TRACKER_EXAMPLES = 5;
const MAX_SEND_ATTEMPTS = 3;
// Short fixed backoff between attempts — total extra delay ~1.5s, so a
// flaky Telegram network never stalls the nightly run for minutes.
const RETRY_DELAYS_MS = [500, 1000];
const REQUEST_TIMEOUT_MS = 10_000;

export type GroundedCronResult = { topic: DiscoveredTopic; response: GenerateIdeasResponse };

/**
 * Escapes text for Telegram's HTML parse_mode. Messages are sent with
 * parse_mode='HTML', so a stray "<" / "&" from LLM content would either 400
 * the send or render entities — this keeps free text safe. Bold is applied
 * explicitly via <b> around KNOWN-SAFE static segments only.
 */
export function esc(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Builds the Hebrew summary sent when the nightly ideas run finishes.
 * Exported for direct unit testing. Returns HTML-ready text (escaped dynamic
 * content + explicit <b> tags) — sendMessage sends it with parse_mode='HTML'.
 * Ideas per domain are sorted by validation score (best first) and capped.
 *
 * When the translation tracker holds records (genetics map misses / terpene
 * LLM translations from enrichment — see core/services/translation-tracker),
 * a short harvest block is appended: "N new strains entered the inventory
 * with names the hardcoded map doesn't cover" becomes a visible work queue
 * instead of a forgotten debug log. The whole message is capped at 4000
 * chars (Telegram's 4096 limit) — tracker block included.
 */
export function buildNightlyIdeasMessage(grounded: GroundedCronResult[]): string {
  const totalIdeas = grounded.reduce((sum, g) => sum + (g.response.result?.length ?? 0), 0);
  const lines: string[] = [
    `🌙 ריצת הלילה הסתיימה — <b>${grounded.length} נושאים, ${totalIdeas} רעיונות חדשים</b>`,
  ];

  for (const { topic, response } of grounded) {
    const ideas = [...(response.result ?? [])].sort((a, b) => b.validationScore - a.validationScore);
    lines.push('', `📌 <b>${esc(topic.domain)}</b>`);

    for (const idea of ideas.slice(0, MAX_IDEAS_PER_DOMAIN)) {
      const score = typeof idea.validationScore === 'number' ? `${idea.validationScore}/10` : '—';
      lines.push(`• ${esc(idea.title)} — ${score}`);
      const desc = idea.description?.trim();
      if (desc) {
        const clipped = desc.length > MAX_DESCRIPTION_CHARS ? `${desc.slice(0, MAX_DESCRIPTION_CHARS)}…` : desc;
        lines.push(`  ${esc(clipped)}`);
      }
    }

    const skipped = ideas.length - Math.min(ideas.length, MAX_IDEAS_PER_DOMAIN);
    if (skipped > 0) {
      lines.push(`  … ועוד ${skipped} רעיונות`);
    }
  }

  lines.push('', 'פרטים מלאים בהיסטוריית הרעיונות באפליקציה.');

  const full = `${lines.join('\n')}${buildTranslationTrackerSection()}`;
  if (full.length <= MAX_MESSAGE_CHARS) {
    return full;
  }
  return `${full.slice(0, MAX_MESSAGE_CHARS - 1)}…`;
}

/**
 * The translation-harvest block appended to the nightly Telegram summary.
 * Empty string when the tracker holds nothing (quiet days keep the summary
 * clean). Names are escaped (parse_mode='HTML') — they come from inventory
 * data / LLM output, never trusted. Counts are distinct Hebrew names since
 * process start (see TranslationTracker).
 */
export function buildTranslationTrackerSection(): string {
  const lines: string[] = [];

  const geneticsMisses = translationTracker.recentGeneticsMisses(MAX_TRACKER_EXAMPLES);
  if (geneticsMisses.length > 0) {
    lines.push(
      `🧬 <b>מפת גנטיקה (מאז אתחול):</b> ${translationTracker.geneticsMissCount()} שמות חדשים — ` +
        geneticsMisses.map((r) => `${esc(r.hebrew)}→${esc(r.english)}`).join(', '),
    );
  }

  const terpeneTranslations = translationTracker.recentTerpeneTranslations(MAX_TRACKER_EXAMPLES);
  if (terpeneTranslations.length > 0) {
    lines.push(
      `🧪 <b>טרפנים (מאז אתחול):</b> ${translationTracker.terpeneTranslationCount()} תרגומי LLM — ` +
        terpeneTranslations.map((r) => `${esc(r.hebrew)}→${esc(r.english)}`).join(', '),
    );
  }

  return lines.length > 0 ? `\n${lines.join('\n')}` : '';
}

/**
 * Sends messages via the Telegram Bot API using a JSON body with
 * parse_mode='HTML' — Hebrew survives intact (the form-encoding/curl path
 * mangles it) and <b>…</b> renders bold. The TEXT must be HTML-safe (see
 * esc() / buildNightlyIdeasMessage) — sendMessage applies no transformation.
 *
 * Configuration (both required, otherwise notifications are skipped):
 * - TELEGRAM_BOT_TOKEN
 * - TELEGRAM_CHAT_ID
 *
 * Never throws: failures are logged and reported as `false` so the nightly
 * cron is never interrupted by a notification problem.
 *
 * Retry policy — transient only: network/DNS/timeout errors and HTTP 5xx are
 * retried up to MAX_SEND_ATTEMPTS with a short backoff. Terminal failures are
 * NOT retried, because a retry cannot fix them and would only waste time:
 * missing config, API `ok:false` (bad/expired token, unknown chat, blocked
 * bot) and HTTP 4xx.
 */
@Injectable()
export class TelegramNotifyService {
  private readonly logger = new Logger(TelegramNotifyService.name);

  constructor(private readonly httpService: HttpService) {}

  isEnabled(): boolean {
    return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);
  }

  async sendMessage(text: string): Promise<boolean> {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!token || !chatId) {
      this.logger.warn('Telegram notification skipped — TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID not set');
      return false;
    }

    let lastError: unknown = null;
    for (let attempt = 1; attempt <= MAX_SEND_ATTEMPTS; attempt += 1) {
      const { sent, transient, error } = await this.trySend(token, chatId, text);
      if (sent) {
        return true;
      }
      if (!transient) {
        return false; // terminal — retrying cannot help
      }
      lastError = error;

      if (attempt < MAX_SEND_ATTEMPTS) {
        const delayMs = RETRY_DELAYS_MS[attempt - 1] ?? 1000;
        this.logger.warn(
          `Telegram sendMessage attempt ${attempt}/${MAX_SEND_ATTEMPTS} failed (transient) — retrying in ${delayMs}ms`,
        );
        await this.sleep(delayMs);
      }
    }

    const msg = lastError instanceof Error ? lastError.message : String(lastError ?? 'Unknown error');
    this.logger.error(`Telegram sendMessage failed after ${MAX_SEND_ATTEMPTS} attempts: ${msg}`);
    return false;
  }

  /**
   * One send attempt. `transient: true` means the failure is worth retrying.
   */
  private async trySend(
    token: string,
    chatId: string,
    text: string,
  ): Promise<{ sent: boolean; transient: boolean; error?: unknown }> {
    try {
      const response$ = this.httpService.post(
        `${TELEGRAM_API}/bot${token}/sendMessage`,
        { chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true },
        { timeout: REQUEST_TIMEOUT_MS },
      );
      const { data } = await firstValueFrom(response$);

      if (data?.ok !== true) {
        // The API answered — a terminal business rejection. Retrying cannot fix it.
        this.logger.warn(`Telegram sendMessage rejected: ${JSON.stringify(data)}`);
        return { sent: false, transient: false };
      }
      return { sent: true, transient: false };
    } catch (error) {
      return { sent: false, transient: this.isTransientFailure(error), error };
    }
  }

  private isTransientFailure(error: unknown): boolean {
    if (error && typeof error === 'object') {
      const status = (error as { response?: { status?: number } }).response?.status;
      if (typeof status === 'number') {
        // An HTTP response arrived: only 5xx are worth retrying.
        return status >= 500;
      }
    }
    // No HTTP response at all (DNS / network / timeout) — worth retrying.
    return true;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
