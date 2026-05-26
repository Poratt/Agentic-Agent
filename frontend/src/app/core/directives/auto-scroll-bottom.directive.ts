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

  @Input() autoScrollBottom: boolean = true;

  @Input() set autoScrollBottomTrigger(_: unknown) {
    if (!this.autoScrollBottom) return;
    this.scrollToBottom();
  }

  ngAfterViewInit(): void {
    if (!this.autoScrollBottom) return;

    this.ngZone.runOutsideAngular(() => {
      this.observer = new MutationObserver(() => this.scrollToBottom());
      this.observer.observe(this.host.nativeElement, { childList: true, subtree: true });
    });

    this.scrollToBottom();
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    this.observer = undefined;
  }

  private scrollToBottom(): void {
    const el = this.host.nativeElement;
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }
}
