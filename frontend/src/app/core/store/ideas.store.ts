import { Injectable, inject, signal, computed } from '@angular/core';
import { Subscription } from 'rxjs';
import { IdeasService } from '../services/ideas.service';
import { PageStates } from '../enums/page-states.enum';
import { BusinessIdea, GenerateIdeasResponse, IdeasProgressEvent } from '../models/idea.interface';

@Injectable({ providedIn: 'root' })
export class IdeasStore {
  private ideasService = inject(IdeasService);
  private sub: Subscription | null = null;

  domain = signal('');
  count = signal(5);
  ideas = signal<BusinessIdea[]>([]);
  phase = signal<number | 'done' | 'error'>(0);
  statusText = signal('');
  loading = signal(false);
  error = signal<string | null>(null);
  partial = signal(false);
  failedCount = signal<number | null>(null);
  message = signal('');

  pageState = computed<PageStates>(() => {
    if (this.error()) return PageStates.Error;
    if (this.loading()) return PageStates.Loading;
    if (this.ideas().length > 0) return PageStates.Ready;
    return PageStates.Empty;
  });

  totalRequested = computed(() => this.ideas().length + (this.failedCount() ?? 0));

  setDomain(value: string): void {
    this.domain.set(value);
  }

  setCount(value: number): void {
    this.count.set(value);
  }

  generate(): void {
    const domain = this.domain().trim();
    if (!domain) {
      this.error.set('נא להזין תחום עסקי');
      return;
    }

    this.sub?.unsubscribe();
    this.loading.set(true);
    this.error.set(null);
    this.ideas.set([]);
    this.partial.set(false);
    this.failedCount.set(null);
    this.message.set('');
    this.phase.set(0);
    this.statusText.set('מתחיל...');

    this.sub = this.ideasService.generateStream(domain, this.count()).subscribe({
      next: (event: IdeasProgressEvent) => this.handleEvent(event),
      error: (err: unknown) => {
        const msg = err instanceof Error ? err.message : 'אירעה שגיאה ביצירת הרעיונות';
        this.error.set(msg);
        this.loading.set(false);
      },
    });
  }

  private handleEvent(event: IdeasProgressEvent): void {
    if (event.phase === 'error') {
      this.error.set(event.message);
      this.loading.set(false);
      return;
    }

    if (event.phase === 'done') {
      this.applyResult(event.result);
      this.loading.set(false);
      return;
    }

    this.phase.set(event.phase);
    this.statusText.set(event.status);
  }

  private applyResult(result: GenerateIdeasResponse): void {
    this.ideas.set(result.result ?? []);
    this.partial.set(result.partial);
    this.failedCount.set(result.failedCount ?? null);
    this.message.set(result.message ?? '');
    if (!result.success) {
      this.error.set(result.message || 'יצירת הרעיונות נכשלה');
    }
  }

  clearError(): void {
    this.error.set(null);
  }
}
