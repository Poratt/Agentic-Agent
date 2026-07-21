import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-ideas-progress',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ideas-progress.html',
  styleUrl: './ideas-progress.css',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class IdeasProgress {
  phase = input<number | 'done' | 'error'>(0);
  statusText = input<string>('');

  phaseActive(step: number): boolean {
    const p = this.phase();
    return typeof p === 'number' && p >= step;
  }
}
