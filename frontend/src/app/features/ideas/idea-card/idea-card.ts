import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
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
  expanded = input(false);
  savedIdeaId = input<number | undefined>(undefined);
  isFavorite = input<boolean>(false);
  toggled = output<void>();
  toggleFav = output<{ ideaId: number; isFavorite: boolean }>();

  scoreVariant(score: number): 'success' | 'warning' | 'danger' {
    if (score >= 7) return 'success';
    if (score >= 4) return 'warning';
    return 'danger';
  }

  toggle(): void {
    this.toggled.emit();
  }

  onToggleFav(): void {
    if (this.savedIdeaId() != null) {
      this.toggleFav.emit({ ideaId: this.savedIdeaId()!, isFavorite: !this.isFavorite() });
    }
  }
}
