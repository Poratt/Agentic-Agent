import { HttpClient } from '@angular/common/http';
import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { catchError, debounceTime, of, Subject, switchMap, tap } from 'rxjs';
import { AuthStore } from './auth.store';
import { ServiceResultContainer } from '../models/service-result-container.model';
import { environment } from '../../environments/environment';

export type PrefState = 'neutral' | 'like' | 'love' | 'avoid';

export type PrefMap = Record<string, PrefState>;

export type Weights = {
  terpene: number;
  genetics: number;
};

export type ScoreBreakdown = {
  terpene: {
    weight: number;
    earnedPoints: number;
    maxPoints: number;
    hits: string[];
    misses: string[];
  };
  genetics: {
    weight: number;
    hasMatch: boolean;
    preferred: string[];
    hits: string[];
  };
  penalty: boolean;
  penaltyIngredient: string | null;
};

export type ScoredStrain<T = Record<string, unknown>> = T & {
  score: number;
  penalty: boolean;
  penaltyIngredient: string | null;
  breakdown: ScoreBreakdown;
};

const STORAGE_PREFIX = 'matching-engine:v1';

const VALID_PREF_STATES = new Set<string>(['neutral', 'like', 'love', 'avoid']);

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
  private readonly http = inject(HttpClient);
  private readonly authStore = inject(AuthStore);

  private readonly prefsState = signal<PrefMap>({});
  private readonly weightsState = signal<Weights>({ ...DEFAULT_WEIGHTS });

  private readonly sync$ = new Subject<PersistedShape>();
  private isHydrating = false;

  public readonly prefs = this.prefsState.asReadonly();
  public readonly weights = this.weightsState.asReadonly();

  public readonly hasAnyPreference = computed(() => {
    const prefs = this.prefsState();
    return Object.values(prefs).some((state) => state !== 'neutral');
  });

  constructor() {
    this.setupSyncPipeline();

    effect(() => {
      const user = this.authStore.user();
      const userId = this.getActiveUserId();

      if (user && userId !== null) {
        this.handleLogin(userId);
      } else {
        this.handleLogout();
      }
    });

    effect(() => {
      const snapshot: PersistedShape = {
        prefs: this.prefsState(),
        weights: this.weightsState(),
      };

      const userId = this.getActiveUserId();

      if (this.isHydrating || userId === null) {
        return;
      }

      const storageKey = this.buildStorageKey(userId);

      try {
        localStorage.setItem(storageKey, JSON.stringify(snapshot));
      } catch {
        // Storage unavailable
      }

      this.sync$.next(snapshot);
    });
  }

  public cyclePref(key: string): void {
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

  public setPref(key: string, state: PrefState): void {
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

  public setWeight(category: keyof Weights, value: number): void {
    const clamped = Math.max(0, Math.min(100, Math.round(value)));
    const otherCategory = category === 'terpene' ? 'genetics' : 'terpene';

    this.weightsState.set({
      [category]: clamped,
      [otherCategory]: 100 - clamped,
    } as Weights);
  }

  public reset(): void {
    this.prefsState.set({});
    this.weightsState.set({ ...DEFAULT_WEIGHTS });
  }

  public prefState(key: string): PrefState {
    return this.prefsState()[key] ?? 'neutral';
  }

  public calculateScore<T extends Record<string, unknown>>(item: T): ScoredStrain<T> {
    const prefs = this.prefsState();
    const weights = this.weightsState();

    const terpeneData = this.scoreCategory(item, 'terpene', prefs, 'proportional');
    const geneticsData = this.scoreCategory(item, 'genetics', prefs, 'any');

    const activeTerpWeight = terpeneData.hasPositivePrefs ? weights.terpene : 0;
    const activeGenWeight = geneticsData.hasPositivePrefs ? weights.genetics : 0;
    const totalActiveWeight = activeTerpWeight + activeGenWeight;

    let weightedBaseScore = 100;

    if (totalActiveWeight > 0) {
      const terpScore = terpeneData.maxPoints > 0 ? terpeneData.earnedPoints / terpeneData.maxPoints : 0;
      const genScore = geneticsData.hasMatch ? 1 : 0;

      weightedBaseScore = (((terpScore * activeTerpWeight) + (genScore * activeGenWeight)) / totalActiveWeight) * 100;
    }

    const penaltyIngredient = terpeneData.penaltyIngredient ?? geneticsData.penaltyIngredient;
    const penaltyDeduction = penaltyIngredient ? 30 : 0;

    const score = Math.max(0, Math.min(100, Math.round(weightedBaseScore - penaltyDeduction)));

    const breakdown: ScoreBreakdown = {
      terpene: {
        weight: activeTerpWeight,
        earnedPoints: terpeneData.earnedPoints,
        maxPoints: terpeneData.maxPoints,
        hits: terpeneData.hits,
        misses: terpeneData.misses,
      },
      genetics: {
        weight: activeGenWeight,
        hasMatch: geneticsData.hasMatch,
        preferred: geneticsData.misses.concat(geneticsData.hits),
        hits: geneticsData.hits,
      },
      penalty: penaltyIngredient !== null,
      penaltyIngredient: penaltyIngredient,
    };

    return {
      ...item,
      score,
      penalty: penaltyIngredient !== null,
      penaltyIngredient,
      breakdown,
    };
  }

  public topScored<T extends Record<string, unknown>>(items: T[], limit = 5): ScoredStrain<T>[] {
    if (items.length === 0) {
      return [];
    }

    return [...items]
      .map((item) => this.calculateScore(item))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  private handleLogin(userId: number): void {
    this.isHydrating = true;

    const storageKey = this.buildStorageKey(userId);
    const shape = this.loadFromStorage(storageKey);

    if (shape) {
      this.prefsState.set(shape.prefs);
      this.weightsState.set({ ...DEFAULT_WEIGHTS, ...shape.weights });
    }

    this.isHydrating = false;

    this.fetchRemotePreferences(userId, shape);
  }

  private handleLogout(): void {
    this.prefsState.set({});
    this.weightsState.set({ ...DEFAULT_WEIGHTS });
    this.cleanAllMatchingKeys();
  }

  private fetchRemotePreferences(userId: number, localShape: PersistedShape | null): void {
    this.http
      .get<ServiceResultContainer<{ prefs: PrefMap; weights: Weights }>>(`${environment.apiUrl}/strain-hunter/preferences`)
      .pipe(
      tap((res) => {
        const remote = res.result;
        const hasRemotePrefs = Object.keys(remote.prefs ?? {}).length > 0;
        const hasLocalPrefs = localShape !== null && Object.keys(localShape.prefs).length > 0;

        if (hasRemotePrefs) {
          this.isHydrating = true;
          this.prefsState.set(remote.prefs ?? {});
          this.weightsState.set({ ...DEFAULT_WEIGHTS, ...remote.weights });
          this.isHydrating = false;
          return;
        }

        if (hasLocalPrefs && localShape) {
          this.sync$.next(localShape);
        }
      }),
      catchError(() => of(null)),
    ).subscribe();
  }

  private setupSyncPipeline(): void {
    this.sync$
      .pipe(
        debounceTime(500),
        switchMap((snapshot) => {
          return this.http.put(`${environment.apiUrl}/strain-hunter/preferences`, snapshot).pipe(
            catchError(() => of(null)),
          );
        }),
      )
      .subscribe();
  }

  private buildStorageKey(userId: number): string {
    return `${STORAGE_PREFIX}:user_${userId}`;
  }

  private getActiveUserId(): number | null {
    const user = this.authStore.user();
    if (!user) {
      return null;
    }
    const id = user.id ?? (user as unknown as { sub?: number }).sub;
    return typeof id === 'number' ? id : null;
  }

  private loadFromStorage(key: string): PersistedShape | null {
    try {
      const raw = localStorage.getItem(key);

      if (!raw) {
        return null;
      }

      const parsed = JSON.parse(raw) as Partial<PersistedShape>;

      return this.validatePersistedShape(parsed) ? parsed as PersistedShape : null;
    } catch {
      return null;
    }
  }

  private validatePersistedShape(shape: Partial<PersistedShape>): shape is PersistedShape {
    if (!shape || typeof shape !== 'object') {
      return false;
    }

    if (!shape.prefs || typeof shape.prefs !== 'object' || Array.isArray(shape.prefs)) {
      return false;
    }

    for (const [key, value] of Object.entries(shape.prefs)) {
      if (typeof key !== 'string' || !VALID_PREF_STATES.has(value as string)) {
        return false;
      }
    }

    if (!shape.weights || typeof shape.weights !== 'object' || Array.isArray(shape.weights)) {
      return false;
    }

    const { terpene, genetics } = shape.weights as Record<string, unknown>;

    if (typeof terpene !== 'number' || typeof genetics !== 'number') {
      return false;
    }

    if (terpene < 0 || terpene > 100 || genetics < 0 || genetics > 100) {
      return false;
    }

    return true;
  }

  private cleanAllMatchingKeys(): void {
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);

      if (key && key.startsWith(STORAGE_PREFIX)) {
        keysToRemove.push(key);
      }
    }

    for (const key of keysToRemove) {
      localStorage.removeItem(key);
    }
  }

  private scoreCategory(
    item: Record<string, unknown>,
    category: keyof Weights,
    prefs: PrefMap,
    matchMode: 'proportional' | 'any'
  ): {
    earnedPoints: number;
    maxPoints: number;
    hasPositivePrefs: boolean;
    hasMatch: boolean;
    penaltyIngredient: string | null;
    hits: string[];
    misses: string[];
  } {
    const ingredients = this.extractIngredients(item, category);

    let maxPoints = 0;
    let hasPositivePrefs = false;
    const desired: string[] = [];

    for (const [key, state] of Object.entries(prefs)) {
      if (key.startsWith(`${category}:`)) {
        const name = key.substring(category.length + 1);
        if (state === 'love') {
          maxPoints += 2;
          hasPositivePrefs = true;
          desired.push(name);
        } else if (state === 'like') {
          maxPoints += 1;
          hasPositivePrefs = true;
          desired.push(name);
        }
      }
    }

    let earnedPoints = 0;
    let penaltyIngredient: string | null = null;
    const hits: string[] = [];

    for (const name of ingredients) {
      const state = prefs[`${category}:${name}`];

      if (state === 'love') {
        earnedPoints += 2;
        hits.push(name);
      } else if (state === 'like') {
        earnedPoints += 1;
        hits.push(name);
      } else if (state === 'avoid') {
        if (penaltyIngredient === null) {
          penaltyIngredient = name;
        }
      }
    }

    const misses = desired.filter((d) => {
      return !hits.includes(d);
    });

    const hasMatch = hits.length > 0;

    return { earnedPoints, maxPoints, hasPositivePrefs, hasMatch, penaltyIngredient, hits, misses };
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
}
