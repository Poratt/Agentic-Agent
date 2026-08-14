import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SavedIdea } from '../../../core/models/saved-idea.model';

@Component({
  selector: 'app-idea-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './idea-card.html',
  styleUrl: './idea-card.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IdeaCard {
  idea = input.required<SavedIdea>();
  expanded = input(false);
  toggled = output<void>();
  toggleFav = output<{ ideaId: number; isFavorite: boolean }>();

  scoreVariant(score: number): 'success' | 'warning' | 'danger' {
    if (score >= 7) return 'success';
    if (score >= 4) return 'warning';
    return 'danger';
  }

  competitorSearchUrl(name: string): string {
    return `https://www.google.com/search?q=${encodeURIComponent(name)}`;
  }

  toggle(): void {
    this.toggled.emit();
  }

  onToggleFav(): void {
    const id = this.idea().id;
    if (id != null) {
      this.toggleFav.emit({ ideaId: id, isFavorite: !this.idea().isFavorite });
    }
  }
}
