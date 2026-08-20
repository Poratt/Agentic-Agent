/**
 * In-memory tracker for LLM-based strain/terpene name translations.
 *
 * Genetics: records a record when the hardcoded Hebrew→English map misses and
 * the LLM produced the English name (the "map miss" harvest queue — who
 * updates the map when a new strain enters the inventory).
 * Terpene: records EVERY LLM translation (there is no hardcoded map baseline
 * to miss from, so this is the data that would seed a future terpene map).
 *
 * Module-level singleton (one backend process): the nightly Telegram summary
 * reads it and reports the totals + examples, so translation misses become a
 * visible work queue instead of a forgotten debug log. In-memory = since
 * process start; a monthly-persistent version would be a DB table (that is
 * the future "learned cache" decision, not this tracker's job).
 *
 * Deduped by Hebrew name (latest translation wins) — a strain translated in
 * several enrichment chunks counts once, so the count = distinct new names.
 */

export interface TranslationRecord {
  hebrew: string;
  english: string;
  at: number;
}

const MAX_RECORDS = 200;

class TranslationTracker {
  private geneticsMisses = new Map<string, TranslationRecord>();
  private terpeneTranslations = new Map<string, TranslationRecord>();

  recordGeneticsMiss(hebrew: string, english: string): void {
    this.geneticsMisses.set(hebrew, { hebrew, english, at: Date.now() });
    this.trim(this.geneticsMisses);
  }

  recordTerpeneTranslation(hebrew: string, english: string): void {
    this.terpeneTranslations.set(hebrew, { hebrew, english, at: Date.now() });
    this.trim(this.terpeneTranslations);
  }

  geneticsMissCount(): number {
    return this.geneticsMisses.size;
  }

  terpeneTranslationCount(): number {
    return this.terpeneTranslations.size;
  }

  totalCount(): number {
    return this.geneticsMisses.size + this.terpeneTranslations.size;
  }

  /** Most recent records, newest first. */
  recentGeneticsMisses(limit: number): TranslationRecord[] {
    return [...this.geneticsMisses.values()].reverse().slice(0, limit);
  }

  /** Most recent records, newest first. */
  recentTerpeneTranslations(limit: number): TranslationRecord[] {
    return [...this.terpeneTranslations.values()].reverse().slice(0, limit);
  }

  reset(): void {
    this.geneticsMisses.clear();
    this.terpeneTranslations.clear();
  }

  private trim(map: Map<string, TranslationRecord>): void {
    // Map preserves insertion order — the first key is the oldest recorded.
    while (map.size > MAX_RECORDS) {
      const oldest = map.keys().next().value;
      if (oldest === undefined) break;
      map.delete(oldest);
    }
  }
}

export const translationTracker = new TranslationTracker();
