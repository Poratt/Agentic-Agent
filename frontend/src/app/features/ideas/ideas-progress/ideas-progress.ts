import { Component, input, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-ideas-progress',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div class="glass-effect card ideas-progress-card liquid-glow">
      <div class="glow-bg"></div>
      
      <div class="phases-row">
        <div class="phase-item" [class.active]="phaseActive(0)" [class.done]="isDone(0)">
          <div class="phase-icon">
            <span class="ph ph-magnifying-glass"></span>
          </div>
          <span class="phase-label">Research</span>
        </div>
        <div class="phase-line" [class.filled]="phaseActive(1)"></div>
        <div class="phase-item" [class.active]="phaseActive(1)" [class.done]="isDone(1)">
          <div class="phase-icon">
            <span class="ph ph-code"></span>
          </div>
          <span class="phase-label">Build</span>
        </div>
        <div class="phase-line" [class.filled]="phaseActive(2)"></div>
        <div class="phase-item" [class.active]="phaseActive(2)" [class.done]="isDone(2)">
          <div class="phase-icon">
            <span class="ph ph-rocket"></span>
          </div>
          <span class="phase-label">Launch</span>
        </div>
      </div>
      
      <div class="status-area">
        <div class="status-indicator">
          <span class="ph ph-spinner ph-spin" [class.error]="phase() === 'error'"></span>
          <span class="status-text">{{ statusText() }}</span>
        </div>
        <div class="progress-percentage">{{ progress() }}%</div>
      </div>
    </div>
  `,
  styles: [`
    .ideas-progress-card.liquid-glow {
      position: relative;
      padding: var(--space-20) var(--space-24);
      overflow: hidden;
      border: 1px solid var(--glass-border);
    }

    .glow-bg {
      position: absolute;
      top: -50%;
      left: -50%;
      width: 200%;
      height: 200%;
      background: radial-gradient(circle at center, var(--color-primary-glow) 0%, transparent 50%);
      opacity: 0.3;
      animation: pulse 4s ease-in-out infinite;
      pointer-events: none;
    }

    @keyframes pulse {
      0%, 100% { transform: scale(1); opacity: 0.3; }
      50% { transform: scale(1.1); opacity: 0.5; }
    }

    .phases-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: var(--space-20);
      position: relative;
      z-index: 1;
    }

    .phase-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-6);
      opacity: 0.4;
      transition: all 0.4s cubic-bezier(0.22, 1, 0.36, 1);

      &.active, &.done {
        opacity: 1;
      }
    }

    .phase-icon {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: var(--color-surface);
      border: 2px solid var(--color-border);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.4s cubic-bezier(0.22, 1, 0.36, 1);

      .ph {
        font-size: var(--font-size-xl);
        color: var(--color-text-secondary);
        transition: color 0.4s ease;
      }

      .phase-item.active & {
        border-color: var(--color-primary);
        box-shadow: 0 0 20px var(--color-primary-glow);
        transform: scale(1.1);

        .ph {
          color: var(--color-primary);
        }
      }

      .phase-item.done & {
        background: var(--color-primary);
        border-color: var(--color-primary);

        .ph {
          color: var(--color-bg);
        }
      }
    }

    .phase-label {
      font-size: var(--font-size-xs);
      color: var(--color-text-secondary);
      font-weight: var(--font-weight-medium);

      .phase-item.active & {
        color: var(--color-primary);
      }
    }

    .phase-line {
      flex: 1;
      height: 2px;
      background: var(--color-border);
      margin: 0 var(--space-8);
      position: relative;
      overflow: hidden;
      border-radius: var(--radius-pill);

      &::after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        height: 100%;
        width: 0;
        background: linear-gradient(90deg, var(--color-primary), var(--color-secondary));
        transition: width 0.6s cubic-bezier(0.22, 1, 0.36, 1);
      }

      &.filled::after {
        width: 100%;
      }
    }

    .status-area {
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: relative;
      z-index: 1;
    }

    .status-indicator {
      display: flex;
      align-items: center;
      gap: var(--space-8);

      .ph {
        color: var(--color-primary);
        font-size: var(--font-size-lg);

        &.error {
          color: var(--color-danger);
        }
      }
    }

    .status-text {
      font-size: var(--font-size-sm);
      color: var(--color-text-secondary);
    }

    .progress-percentage {
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-semibold);
      color: var(--color-primary);
      font-variant-numeric: tabular-nums;
    }
  `]
})
export class IdeasProgress {
  phase = input<number | 'done' | 'error'>(0);
  statusText = input<string>('');

  phaseActive(step: number): boolean {
    const p = this.phase();
    return typeof p === 'number' && p >= step;
  }

  isDone(step: number): boolean {
    const p = this.phase();
    if (p === 'done') return true;
    return typeof p === 'number' && p > step;
  }

  progress = computed(() => {
    const p = this.phase();
    if (p === 'done') return 100;
    if (p === 'error') return 0;
    return Math.round(((p as number) + 1) * 33.33);
  });
}
