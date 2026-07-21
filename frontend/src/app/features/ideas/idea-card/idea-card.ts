import { Component, input, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BusinessIdea } from '../../../core/models/idea.interface';

@Component({
  selector: 'app-idea-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './idea-card.html',
  styleUrl: './idea-card.css',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class IdeaCard {
  idea = input.required<BusinessIdea>();
  expanded = signal(false);

  scoreVariant(score: number): 'success' | 'warning' | 'danger' {
    if (score >= 7) return 'success';
    if (score >= 4) return 'warning';
    return 'danger';
  }

  toggle(): void {
    this.expanded.update((v) => !v);
  }
}
