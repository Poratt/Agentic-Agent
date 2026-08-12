import { Component, input, output, ChangeDetectionStrategy, signal, effect } from '@angular/core';
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
  expandedInitial = input(false, { alias: 'expanded' });
  
  toggled = output<void>();
  toggleFav = output<{ ideaId: number; isFavorite: boolean }>();

  expanded = signal(false);

  constructor() {
    effect(() => {
      this.expanded.set(this.expandedInitial());
    }, { allowSignalWrites: true });
  }

  scoreVariant(score: number): 'success' | 'warning' | 'danger' {
    if (score >= 7) return 'success';
    if (score >= 4) return 'warning';
    return 'danger';
  }

  toggle(): void {
    this.expanded.update(v => !v);
    this.toggled.emit();
  }

  onToggleFav(): void {
    const id = this.idea().id;
    if (id != null) {
      this.toggleFav.emit({ ideaId: id, isFavorite: !this.idea().isFavorite });
    }
  }
}
