import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MatchingEngineStore } from './matching-engine.store';
import { AuthStore } from './auth.store';
import { User } from '../models/user.interface';
import { UserRole } from '../enums/user-role.enum';

describe('MatchingEngineStore', () => {
  let authStore: { user: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    authStore = { user: vi.fn(() => null) };

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        MatchingEngineStore,
        { provide: AuthStore, useValue: authStore },
      ],
    });

    localStorage.clear();
  });

  function create(): MatchingEngineStore {
    return TestBed.inject(MatchingEngineStore);
  }

  describe('cyclePref', () => {
    it('cycles neutral → like → love → avoid → neutral', () => {
      const store = create();

      store.cyclePref('terpene:Myrcene');
      expect(store.prefState('terpene:Myrcene')).toBe('like');

      store.cyclePref('terpene:Myrcene');
      expect(store.prefState('terpene:Myrcene')).toBe('love');

      store.cyclePref('terpene:Myrcene');
      expect(store.prefState('terpene:Myrcene')).toBe('avoid');

      store.cyclePref('terpene:Myrcene');
      expect(store.prefState('terpene:Myrcene')).toBe('neutral');
    });

    it('does nothing for empty key', () => {
      const store = create();
      store.cyclePref('');
      expect(store.prefState('')).toBe('neutral');
    });
  });

  describe('setPref', () => {
    it('sets preference state', () => {
      const store = create();
      store.setPref('terpene:Myrcene', 'love');
      expect(store.prefState('terpene:Myrcene')).toBe('love');
    });

    it('removes key when set to neutral', () => {
      const store = create();
      store.setPref('terpene:Myrcene', 'like');
      expect(store.prefState('terpene:Myrcene')).toBe('like');

      store.setPref('terpene:Myrcene', 'neutral');
      expect(store.prefState('terpene:Myrcene')).toBe('neutral');
      expect(store.prefs()['terpene:Myrcene']).toBeUndefined();
    });

    it('does nothing for empty key', () => {
      const store = create();
      store.setPref('', 'love');
      expect(store.prefs()['']).toBeUndefined();
    });
  });

  describe('setWeight', () => {
    it('clamps 0-100 and sets weight', () => {
      const store = create();
      store.setWeight('terpene', 70);

      expect(store.weights().terpene).toBe(70);
      expect(store.weights().genetics).toBe(30);
    });

    it('clamps negative to 0', () => {
      const store = create();
      store.setWeight('terpene', -10);

      expect(store.weights().terpene).toBe(0);
      expect(store.weights().genetics).toBe(100);
    });

    it('clamps above 100 to 100', () => {
      const store = create();
      store.setWeight('terpene', 150);

      expect(store.weights().terpene).toBe(100);
      expect(store.weights().genetics).toBe(0);
    });

    it('rounds fractional values', () => {
      const store = create();
      store.setWeight('terpene', 33.7);

      expect(store.weights().terpene).toBe(34);
      expect(store.weights().genetics).toBe(66);
    });
  });

  describe('reset', () => {
    it('clears all preferences and resets weights', () => {
      const store = create();
      store.setPref('terpene:Myrcene', 'love');
      store.setWeight('terpene', 80);

      store.reset();

      expect(Object.keys(store.prefs())).toHaveLength(0);
      expect(store.weights()).toEqual({ terpene: 60, genetics: 40 });
    });
  });

  describe('prefState', () => {
    it('returns neutral for unknown key', () => {
      const store = create();
      expect(store.prefState('unknown')).toBe('neutral');
    });

    it('returns current state for known key', () => {
      const store = create();
      store.setPref('genetics:OG Kush', 'avoid');
      expect(store.prefState('genetics:OG Kush')).toBe('avoid');
    });
  });

  describe('calculateScore', () => {
    it('returns base 100 with no preferences', () => {
      const store = create();
      const item = { terpenes: 'Myrcene, Limonene' };
      const result = store.calculateScore(item);

      expect(result.score).toBe(100);
      expect(result.penalty).toBe(false);
    });

    it('applies penalty for avoid ingredient', () => {
      const store = create();
      store.setPref('terpene:Myrcene', 'avoid');
      const item = { terpenes: 'Myrcene, Limonene' };
      const result = store.calculateScore(item);

      expect(result.penalty).toBe(true);
      expect(result.penaltyIngredient).toBe('Myrcene');
      expect(result.score).toBeLessThan(100);
    });

    it('gives higher score for loved ingredients', () => {
      const store = create();
      store.setPref('terpene:Myrcene', 'love');
      const item = { terpenes: 'Myrcene, Limonene' };
      const result = store.calculateScore(item);

      expect(result.score).toBe(100);
      expect(result.breakdown.terpene.hits).toContain('Myrcene');
    });
  });

  describe('topScored', () => {
    it('returns sorted and limited results', () => {
      const store = create();
      store.setPref('terpene:Myrcene', 'love');
      const items = [
        { terpenes: 'Myrcene' },
        { terpenes: 'Limonene' },
        { terpenes: 'Myrcene, Pinene' },
      ];

      const result = store.topScored(items, 2);

      expect(result.length).toBe(2);
      expect(result[0].score).toBeGreaterThanOrEqual(result[1].score);
    });

    it('returns empty for empty input', () => {
      const store = create();
      expect(store.topScored([])).toEqual([]);
    });
  });

  describe('hasAnyPreference', () => {
    it('returns false when no preferences', () => {
      const store = create();
      expect(store.hasAnyPreference()).toBe(false);
    });

    it('returns true when preferences exist', () => {
      const store = create();
      store.setPref('terpene:Myrcene', 'like');
      expect(store.hasAnyPreference()).toBe(true);
    });
  });
});
