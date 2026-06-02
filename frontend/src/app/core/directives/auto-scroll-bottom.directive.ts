import {
  AfterViewInit,
  Directive,
  ElementRef,
  inject,
  Input,
  NgZone,
  OnDestroy,
} from '@angular/core';

@Directive({
  selector: '[autoScrollBottom]',
  standalone: true,
})
export class AutoScrollBottomDirective implements AfterViewInit, OnDestroy {
  private host = inject<ElementRef<HTMLElement>>(ElementRef);
  private ngZone = inject(NgZone);

  private observer?: MutationObserver;
  private frameId?: number;
  private shouldAutoScroll = true;

  @Input() autoScrollBottom: boolean = true;
  @Input() autoScrollBottomThreshold = 96;

  @Input() set autoScrollBottomTrigger(_: unknown) {
    if (!this.autoScrollBottom) return;
    this.scrollToBottom(true);
  }

  ngAfterViewInit(): void {
    if (!this.autoScrollBottom) return;

    this.ngZone.runOutsideAngular(() => {
      const el = this.host.nativeElement;
      el.addEventListener('scroll', this.onScroll, { passive: true });

      this.observer = new MutationObserver(() => this.scrollToBottom());
      this.observer.observe(this.host.nativeElement, { childList: true, subtree: true });
    });

    this.scrollToBottom(true);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    this.observer = undefined;
    this.host.nativeElement.removeEventListener('scroll', this.onScroll);
    if (this.frameId) {
      cancelAnimationFrame(this.frameId);
      this.frameId = undefined;
    }
  }

  private onScroll = (): void => {
    this.shouldAutoScroll = this.isNearBottom();
  };

  private scrollToBottom(force = false): void {
    if (this.frameId) return;
    if (!force && !this.shouldAutoScroll) return;

    const el = this.host.nativeElement;
    this.frameId = requestAnimationFrame(() => {
      this.frameId = undefined;
      el.scrollTop = el.scrollHeight;
      this.shouldAutoScroll = true;
    });
  }

  private isNearBottom(): boolean {
    const el = this.host.nativeElement;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    return distanceFromBottom <= this.autoScrollBottomThreshold;
  }
}
