import { Component, input, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BusinessIdea } from '../../../core/models/idea.interface';
import { IdeaCard } from '../idea-card/idea-card';

@Component({
  selector: 'app-ideas-grid',
  standalone: true,
  imports: [CommonModule, IdeaCard],
  templateUrl: './ideas-grid.html',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class IdeasGrid {
  ideas = input<BusinessIdea[]>([]);
  partial = input<boolean>(false);
  failedCount = input<number | null>(null);
  totalRequested = input<number>(0);
  expandedIndex = signal(-1);

  onToggle(index: number): void {
    this.expandedIndex.update((current) => (current === index ? -1 : index));
  }
}
