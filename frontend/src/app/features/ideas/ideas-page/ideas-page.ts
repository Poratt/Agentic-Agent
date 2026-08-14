import { Component, inject, ChangeDetectionStrategy, OnInit, signal, computed } from '@angular/core';
import { IdeaCard } from '../idea-card/idea-card';
import { CommonModule } from '@angular/common';
import { PageStates } from '../../../core/enums/page-states.enum';
import { IdeasStore } from '../../../core/store/ideas.store';
import { IdeasForm } from '../ideas-form/ideas-form';
import { IdeasProgress } from '../ideas-progress/ideas-progress';
import { SavedIdea } from '../../../core/models/saved-idea.model';
import { TooltipDirective } from '../../../core/directives/tooltip.directive';

type ViewMode = 'all' | 'nightly' | 'favorites';

@Component({
  selector: 'app-ideas-page',
  standalone: true,
  imports: [CommonModule, IdeasForm, IdeasProgress, IdeaCard, TooltipDirective],
  templateUrl: './ideas-page.html',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class IdeasPage implements OnInit {
  protected readonly PageStates = PageStates;
  protected store = inject(IdeasStore);

  protected nightlyBannerDismissed = signal(false);
  protected expandedIndex = signal(-1);
  protected viewMode = signal<ViewMode>('all');
  protected sessionLoading = signal(false);
  protected sessionError = signal<string | null>(null);

  protected displayIdeas = computed<SavedIdea[]>(() => {
    const mode = this.viewMode();
    if (mode === 'all') return this.store.ideas();
    const sessions = this.store.sessions();
    return sessions.flatMap((s) => s.ideas ?? []);
  });

  ngOnInit(): void {
    this.store.loadNightlyUnread();
  }

  dismissNightlyBanner(): void {
    this.nightlyBannerDismissed.set(true);
    this.store.markNightlyRead();
  }

  onToggle(index: number): void {
    this.expandedIndex.update((current) => (current === index ? -1 : index));
  }

  async setViewMode(mode: ViewMode): Promise<void> {
    if (this.viewMode() === mode) return;
    this.viewMode.set(mode);
    this.expandedIndex.set(-1);

    if (mode === 'all') return;

    this.sessionLoading.set(true);
    this.sessionError.set(null);
    try {
      await this.store.loadSessions(mode === 'nightly' ? { nightly: true } : { favorites: true });
    } catch {
      this.sessionError.set('טעינת הרעיונות נכשלה');
    } finally {
      this.sessionLoading.set(false);
    }
  }
}
