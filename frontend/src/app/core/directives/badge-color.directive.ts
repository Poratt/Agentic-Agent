import { Directive, ElementRef, Renderer2, inject, input, effect } from '@angular/core';
import { EnumData } from '../models/enum-data.model';
import { ThemeService } from '../services/theme.service';

@Directive({
	selector: '[badgeColor]',
	standalone: true,
})
export class BadgeColor {
	badgeColor = input<EnumData | string | undefined>('');

	private el = inject(ElementRef);
	private renderer = inject(Renderer2);
	private themeService = inject(ThemeService);

	constructor() {
		effect(() => {
			const value = this.badgeColor();
			const isDark = this.themeService.isDark();

			let color: string;
			if (typeof value === 'string') {
				color = value || '#94A3B8';
			} else if (value) {
				color = (isDark ? value.colorDark : value.colorLight) || value.color || '#94A3B8';
			} else {
				color = '#94A3B8';
			}

			const nativeEl = this.el.nativeElement;

			this.renderer.setStyle(nativeEl, 'color', color);
			this.renderer.setStyle(nativeEl, 'background', color + '1a');
			this.renderer.setStyle(nativeEl, 'border-color', color + '4d');
		});
	}
}