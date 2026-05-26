import { Injectable, computed, signal } from '@angular/core';

export type ThemeMode = 'dark' | 'light';

const THEME_STORAGE_KEY = 'theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly modeSignal = signal<ThemeMode>('dark');

  public readonly mode = this.modeSignal.asReadonly();
  public readonly isDark = computed(() => this.modeSignal() === 'dark');

  public init(): void {
    const stored = this.readStoredMode();
    const mode = stored ?? this.getSystemPreferredMode();
    this.applyMode(mode);
  }

  public toggle(): void {
    const next: ThemeMode = this.modeSignal() === 'dark' ? 'light' : 'dark';
    this.applyMode(next);
    this.persistMode(next);
  }

  public setMode(mode: ThemeMode): void {
    this.applyMode(mode);
    this.persistMode(mode);
  }

  private applyMode(mode: ThemeMode): void {
    this.modeSignal.set(mode);
    document.documentElement.setAttribute('data-theme', mode);
  }

  private persistMode(mode: ThemeMode): void {
    localStorage.setItem(THEME_STORAGE_KEY, mode);
  }

  private readStoredMode(): ThemeMode | null {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    if (value === 'dark' || value === 'light') {
      return value;
    }
    return null;
  }

  private getSystemPreferredMode(): ThemeMode {
    return window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ? 'dark' : 'light';
  }
}

