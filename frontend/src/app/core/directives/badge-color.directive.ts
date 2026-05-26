import { Directive, ElementRef, Renderer2, inject, input, effect } from '@angular/core';

@Directive({
	selector: '[badgeColor]',
	standalone: true,
})
export class BadgeColor {
	badgeColor = input<string | undefined>('');

	private el = inject(ElementRef);
	private renderer = inject(Renderer2);

	constructor() {
		effect(() => {
			const color = this.badgeColor() || '#94A3B8';
			const nativeEl = this.el.nativeElement;

			this.renderer.setStyle(nativeEl, 'color', color);
			this.renderer.setStyle(nativeEl, 'background', color + '1a');
			this.renderer.setStyle(nativeEl, 'border-color', color + '4d');
		});
	}
}