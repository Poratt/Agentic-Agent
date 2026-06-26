import { Injectable, computed, effect, signal } from '@angular/core';

export type PrefState = 'neutral' | 'like' | 'love' | 'avoid';

export type PrefMap = Record<string, PrefState>;

export type Weights = {
  terpene: number;
  genetics: number;
};

export type ScoredStrain<T = Record<string, unknown>> = T & {
  score: number;
  penalty: boolean;
  penaltyIngredient: string | null;
};

const STORAGE_KEY = 'matching-engine:v1';

const PREF_STATES: PrefState[] = ['neutral', 'like', 'love', 'avoid'];

const DEFAULT_WEIGHTS: Weights = {
  terpene: 60,
  genetics: 40,
};

type PersistedShape = {
  prefs: PrefMap;
  weights: Weights;
};

@Injectable({ providedIn: 'root' })
export class MatchingEngineStore {
  private readonly prefsState = signal<PrefMap>({});
  private readonly weightsState = signal<Weights>({ ...DEFAULT_WEIGHTS });

  readonly prefs = this.prefsState.asReadonly();
  readonly weights = this.weightsState.asReadonly();

  readonly hasAnyPreference = computed(() => {
    const prefs = this.prefsState();
    return Object.values(prefs).some((state) => state !== 'neutral');
  });

  constructor() {
    this.hydrate();

    effect(() => {
      const snapshot: PersistedShape = {
        prefs: this.prefsState(),
        weights: this.weightsState(),
      };

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
      } catch {
        // Storage may be unavailable (private mode, SSR, quota). Non-fatal.
      }
    });
  }

  cyclePref(key: string): void {
    const trimmed = key.trim();
    if (!trimmed) {
      return;
    }

    this.prefsState.update((prev) => {
      const current = prev[trimmed] ?? 'neutral';
      const next = PREF_STATES[(PREF_STATES.indexOf(current) + 1) % PREF_STATES.length];
      const updated = { ...prev, [trimmed]: next };
      if (next === 'neutral') {
        delete updated[trimmed];
      }
      return updated;
    });
  }

  setPref(key: string, state: PrefState): void {
    const trimmed = key.trim();
    if (!trimmed) {
      return;
    }

    this.prefsState.update((prev) => {
      const updated = { ...prev, [trimmed]: state };
      if (state === 'neutral') {
        delete updated[trimmed];
      }
      return updated;
    });
  }

  /**
   * FIX 1: סינכרון המשקולות כך שסכומן יהיה תמיד 100% (חווית נדנדה ב-UI)
   */
  setWeight(category: keyof Weights, value: number): void {
    const clamped = Math.max(0, Math.min(100, Math.round(value)));
    const otherCategory = category === 'terpene' ? 'genetics' : 'terpene';

    this.weightsState.set({
      [category]: clamped,
      [otherCategory]: 100 - clamped,
    } as Weights);
  }

  reset(): void {
    this.prefsState.set({});
    this.weightsState.set({ ...DEFAULT_WEIGHTS });
  }

  prefState(key: string): PrefState {
    return this.prefsState()[key] ?? 'neutral';
  }

  /**
   * FIX 2: חישוב מנורמל המבוסס על ממוצע משוקלל אמיתי
   */
  calculateScore<T extends Record<string, unknown>>(item: T): ScoredStrain<T> {
    const prefs = this.prefsState();
    const weights = this.weightsState();

    const terpeneResult = this.scoreCategory(item, 'terpene', prefs);
    const geneticsResult = this.scoreCategory(item, 'genetics', prefs);

    const terpeneMax = terpeneResult.max || 1;
    const geneticsMax = geneticsResult.max || 1;

    // חישוב יחסי הטיב הטהורים של הקטגוריות (ערך בין 0 ל-1)
    const terpeneRatio = terpeneResult.points / terpeneMax;
    const geneticsRatio = geneticsResult.points / geneticsMax;

    // נרמול הציון מול סך המשקולות הקיים (מונע קריסת ציונים בשינוי סליידרים)
    const totalWeight = weights.terpene + weights.genetics;

    let weightedBaseScore = 0;
    if (totalWeight > 0) {
      weightedBaseScore = (((terpeneRatio * weights.terpene) + (geneticsRatio * weights.genetics)) / totalWeight) * 100;
    }

    // החלת קנס (Penalty) במידה וקיימת החלטת Avoid
    const penaltyIngredient = terpeneResult.penaltyIngredient ?? geneticsResult.penaltyIngredient;
    const penaltyDeduction = penaltyIngredient ? 30 : 0;

    const score = Math.max(0, Math.min(100, Math.round(weightedBaseScore - penaltyDeduction)));

    return {
      ...item,
      score,
      penalty: penaltyIngredient !== null,
      penaltyIngredient,
    };
  }

  topScored<T extends Record<string, unknown>>(items: T[], limit = 5): ScoredStrain<T>[] {
    if (items.length === 0) {
      return [];
    }

    return [...items]
      .map((item) => this.calculateScore(item))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  private scoreCategory(item: Record<string, unknown>, category: keyof Weights, prefs: PrefMap): {
    points: number;
    max: number;
    penaltyIngredient: string | null;
  } {
    const ingredients = this.extractIngredients(item, category);
    let points = 0;
    let max = 0;
    let penaltyIngredient: string | null = null;

    for (const name of ingredients) {
      const state = prefs[`${category}:${name}`] ?? 'neutral';
      max += 2;

      if (state === 'love') {
        points += 2;
      } else if (state === 'like') {
        points += 1;
      } else if (state === 'avoid') {
        points += 0;
        if (penaltyIngredient === null) {
          penaltyIngredient = name;
        }
      }
    }

    return { points, max, penaltyIngredient };
  }

  private extractIngredients(item: Record<string, unknown>, category: keyof Weights): string[] {
    if (category === 'terpene') {
      const raw = this.stringField(item, ['terpenes']);
      if (!raw || raw === 'לא ידוע') {
        return [];
      }
      return raw
        .split(',')
        .map((part) => this.stripTerpeneParens(part.trim()))
        .filter((part) => part.length > 0);
    }

    return [
      this.stringField(item, ['originStrain']),
      this.stringField(item, ['parent1']),
      this.stringField(item, ['parent2']),
    ].filter((value) => value.length > 0);
  }

  private stringField(item: Record<string, unknown>, keys: string[]): string {
    for (const key of keys) {
      const value = item[key];
      if (typeof value === 'string' && value.trim().length > 0) {
        return value.trim();
      }
    }
    return '';
  }

  private stripTerpeneParens(value: string): string {
    return value.replace(/\s*\(?\d+(?:[.,]\d+)?\s*%\)?\s*$/u, '').replace(/\s*\(?%\s*\d+(?:[.,]\d+)?\)?\s*$/u, '').trim();
  }

  private hydrate(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return;
      }
      const parsed = JSON.parse(raw) as Partial<PersistedShape>;
      if (parsed.prefs && typeof parsed.prefs === 'object') {
        this.prefsState.set(parsed.prefs as PrefMap);
      }
      if (parsed.weights && typeof parsed.weights === 'object') {
        this.weightsState.set({ ...DEFAULT_WEIGHTS, ...parsed.weights });
      }
    } catch {
      // Corrupt or unavailable storage — start fresh.
    }
  }
}