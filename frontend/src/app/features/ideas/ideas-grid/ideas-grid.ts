import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BusinessIdea } from '../../../core/models/idea.interface';
import { IdeaCard } from '../idea-card/idea-card';

@Component({
  selector: 'app-ideas-grid',
  standalone: true,
  imports: [CommonModule, IdeaCard],
  templateUrl: './ideas-grid.html',
  styleUrl: './ideas-grid.css',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class IdeasGrid {
  ideas = input<BusinessIdea[]>([]);
  partial = input<boolean>(false);
  failedCount = input<number | null>(null);
  totalRequested = input<number>(0);
}
