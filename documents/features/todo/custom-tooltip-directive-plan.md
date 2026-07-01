## Migrate p-tooltip to custom tooltip directive

## 1. ה-Directive

```typescript
========================================
FILE: src/app/shared/directives/app-tooltip.directive.ts
========================================
import {
  Directive,
  ElementRef,
  HostListener,
  Input,
  Renderer2,
  inject,
  OnDestroy,
  ApplicationRef,
  ComponentRef,
  createComponent,
  EnvironmentInjector,
} from '@angular/core';
import { TooltipContentComponent } from './tooltip-content.component';

export type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

@Directive({
  selector: '[appTooltip]',
  standalone: true,
})
export class AppTooltipDirective implements OnDestroy {
  @Input('appTooltip') text = '';
  @Input() tooltipPosition: TooltipPosition = 'top';
  @Input() tooltipDelay = 150;

  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly renderer = inject(Renderer2);
  private readonly appRef = inject(ApplicationRef);
  private readonly environmentInjector = inject(EnvironmentInjector);

  private componentRef: ComponentRef<TooltipContentComponent> | null = null;
  private showTimeoutId: ReturnType<typeof setTimeout> | null = null;

  @HostListener('mouseenter')
  onMouseEnter(): void {
    if (!this.text) {
      return;
    }

    this.showTimeoutId = setTimeout(() => {
      this.show();
    }, this.tooltipDelay);
  }

  @HostListener('mouseleave')
  onMouseLeave(): void {
    this.hide();
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    this.hide();
  }

  private show(): void {
    if (this.componentRef) {
      return;
    }

    this.componentRef = createComponent(TooltipContentComponent, {
      environmentInjector: this.environmentInjector,
    });

    this.componentRef.instance.text = this.text;
    this.appRef.attachView(this.componentRef.hostView);

    const domElement = (this.componentRef.hostView as any).rootNodes[0] as HTMLElement;
    this.renderer.appendChild(document.body, domElement);

    this.positionTooltip(domElement);

    requestAnimationFrame(() => {
      this.componentRef?.instance.setVisible(true);
    });
  }

  private hide(): void {
    if (this.showTimeoutId) {
      clearTimeout(this.showTimeoutId);
      this.showTimeoutId = null;
    }

    if (!this.componentRef) {
      return;
    }

    this.appRef.detachView(this.componentRef.hostView);
    this.componentRef.destroy();
    this.componentRef = null;
  }

  private positionTooltip(domElement: HTMLElement): void {
    const hostRect = this.elementRef.nativeElement.getBoundingClientRect();
    const tooltipRect = domElement.getBoundingClientRect();

    const gap = 8;
    let top = 0;
    let left = 0;

    if (this.tooltipPosition === 'top') {
      top = hostRect.top - tooltipRect.height - gap;
      left = hostRect.left + hostRect.width / 2 - tooltipRect.width / 2;
    } else if (this.tooltipPosition === 'bottom') {
      top = hostRect.bottom + gap;
      left = hostRect.left + hostRect.width / 2 - tooltipRect.width / 2;
    } else if (this.tooltipPosition === 'left') {
      top = hostRect.top + hostRect.height / 2 - tooltipRect.height / 2;
      left = hostRect.left - tooltipRect.width - gap;
    } else {
      top = hostRect.top + hostRect.height / 2 - tooltipRect.height / 2;
      left = hostRect.right + gap;
    }

    const viewportPadding = 8;
    const maxLeft = window.innerWidth - tooltipRect.width - viewportPadding;
    const maxTop = window.innerHeight - tooltipRect.height - viewportPadding;

    left = Math.min(Math.max(left, viewportPadding), maxLeft);
    top = Math.min(Math.max(top, viewportPadding), maxTop);

    this.renderer.setStyle(domElement, 'top', `${top}px`);
    this.renderer.setStyle(domElement, 'left', `${left}px`);
  }

  ngOnDestroy(): void {
    this.hide();
  }
}
```

## 2. קומפוננטת התוכן

```typescript
========================================
FILE: src/app/shared/directives/tooltip-content.component.ts
========================================
import { ChangeDetectionStrategy, Component, Input, signal } from '@angular/core';

@Component({
  selector: 'app-tooltip-content',
  standalone: true,
  template: `
    <div class="app-tooltip" [class.app-tooltip-visible]="visible()">
      {{ text }}
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TooltipContentComponent {
  @Input() text = '';

  private readonly visibleSignal = signal(false);
  readonly visible = this.visibleSignal.asReadonly();

  setVisible(value: boolean): void {
    this.visibleSignal.set(value);
  }
}
```

## 3. CSS גלובלי

```css
========================================
FILE: src/styles/tooltip.css
========================================
.app-tooltip {
  position: fixed;
  z-index: 9999;
  padding: var(--space-2) var(--space-3);
  background: var(--color-surface);
  backdrop-filter: blur(12px);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-soft);
  color: var(--color-text-primary);
  font-size: 0.8125rem;
  font-family: var(--font-main);
  max-width: 260px;
  pointer-events: none;
  opacity: 0;
  transform: translateY(4px);
  transition:
    opacity 0.15s ease-out,
    transform 0.15s ease-out;
}

.app-tooltip-visible {
  opacity: 1;
  transform: translateY(0);
}
```

## שימוש

```html
<span appTooltip="ריכוז מירבי לפי מחקר קליני" tooltipPosition="top">
  <i class="ph ph-info"></i>
</span>
```

## הערות
