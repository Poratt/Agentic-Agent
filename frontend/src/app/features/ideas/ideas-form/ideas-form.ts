import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IdeasStore } from '../../../core/store/ideas.store';

@Component({
  selector: 'app-ideas-form',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ideas-form.html',
  styleUrl: './ideas-form.css',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class IdeasForm {
  protected store = inject(IdeasStore);

  onDomainInput(event: Event): void {
    this.store.setDomain((event.target as HTMLInputElement).value);
  }

  onCountInput(event: Event): void {
    this.store.setCount(Number((event.target as HTMLInputElement).value));
  }
}
