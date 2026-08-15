import { Component, input, computed, ChangeDetectionStrategy, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-ideas-progress',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div class="progress-container">
      <div class="circle-wrapper">
        <div class="progress-ring"></div>
        <div class="icon-container">
          @for (item of phaseItems; track item.phase) {
            <span
              class="ph phase-icon"
              [ngClass]="item.icon"
              [class.active]="currentPhase() === item.phase"
              [class.exit]="exitPhase() === item.phase"
            ></span>
          }
        </div>
      </div>

      <h3 class="phase-name">{{ phaseName() }}</h3>
      <p class="status-text shimmer-text">{{ statusText() }}</p>
    </div>
  `,
  styles: [`
    :host {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 60vh;
    }

    .progress-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-12);
    }

    .circle-wrapper {
      position: relative;
      width: 120px;
      height: 120px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .progress-ring {
      position: absolute;
      inset: 0;
      border-radius: 50%;
      border: 3px solid var(--color-border);
      border-top-color: var(--color-primary);
      border-right-color: var(--color-primary);
      animation: spin 2s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .icon-container {
      position: relative;
      width: 80px;
      height: 80px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .phase-icon {
      position: absolute;
      font-size: 40px;
      color: var(--color-primary);
      opacity: 0;
      transform: translateY(-20px) scale(0.5);
      transition: all 0.5s cubic-bezier(0.22, 1, 0.36, 1);

      &.active {
        opacity: 1;
        transform: translateY(0) scale(1);
      }

      &.exit {
        opacity: 0;
        transform: translateY(30px) scale(0.5);
      }
    }

    .phase-name {
      font-size: var(--font-size-xl);
      font-weight: var(--font-weight-semibold);
      color: var(--color-text-primary);
      margin: 0;
    }

    .status-text {
      font-size: var(--font-size-base);
      color: var(--color-text-muted);
      margin: 0;
      min-width: 200px;
      text-align: center;
    }
  `]
})
export class IdeasProgress {
  phase = input<number | 'done' | 'error'>(0);
  statusText = input<string>('');

  phaseItems = [
    { phase: 0, icon: 'ph-magnifying-glass', name: 'מחקר' },
    { phase: 1, icon: 'ph-code', name: 'בנייה' },
    { phase: 2, icon: 'ph-rocket', name: 'השראה' },
  ];

  currentPhase = signal(0);
  exitPhase = signal<number | null>(null);

  phaseName = computed(() => {
    const p = this.currentPhase();
    const item = this.phaseItems.find(i => i.phase === p);
    return item?.name ?? '';
  });

  constructor() {
    effect(() => {
      const newPhase = this.phase();
      if (typeof newPhase === 'number' && newPhase !== this.currentPhase()) {
        this.exitPhase.set(this.currentPhase());
        this.currentPhase.set(newPhase);
        setTimeout(() => this.exitPhase.set(null), 500);
      }
    });
  }
}
