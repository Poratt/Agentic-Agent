import { Component, inject, ChangeDetectionStrategy, OnInit, signal } from '@angular/core';
import { IdeaCard } from '../idea-card/idea-card';
import { CommonModule } from '@angular/common';
import { PageStates } from '../../../core/enums/page-states.enum';
import { IdeasStore } from '../../../core/store/ideas.store';
import { IdeasForm } from '../ideas-form/ideas-form';
import { IdeasProgress } from '../ideas-progress/ideas-progress';
@Component({
  selector: 'app-ideas-page',
  standalone: true,
  imports: [CommonModule, IdeasForm, IdeasProgress, IdeaCard],
  templateUrl: './ideas-page.html',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class IdeasPage implements OnInit {
  protected readonly PageStates = PageStates;
  protected store = inject(IdeasStore);

  protected nightlyBannerDismissed = signal(false);
  protected expandedIndex = signal(-1);

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
}
