import { Component, inject, ChangeDetectionStrategy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PageStates } from '../../../core/enums/page-states.enum';
import { IdeasStore } from '../../../core/store/ideas.store';
import { IdeasForm } from '../ideas-form/ideas-form';
import { IdeasProgress } from '../ideas-progress/ideas-progress';
import { IdeasGrid } from '../ideas-grid/ideas-grid';
@Component({
  selector: 'app-ideas-page',
  standalone: true,
  imports: [CommonModule, IdeasForm, IdeasProgress, IdeasGrid],
  templateUrl: './ideas-page.html',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class IdeasPage implements OnInit {
  protected readonly PageStates = PageStates;
  protected store = inject(IdeasStore);

  protected nightlyBannerDismissed = signal(false);

  ngOnInit(): void {
    this.store.loadNightlyUnread();
  }

  dismissNightlyBanner(): void {
    this.nightlyBannerDismissed.set(true);
    this.store.markNightlyRead();
  }
}
