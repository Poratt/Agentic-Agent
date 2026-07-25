import { Component, input, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TooltipDirective } from '../../../../core/directives/tooltip.directive';

export interface AgnesImageRenderData {
    url?: string;
    b64Json?: string;
    mimeType?: string;
    size?: string;
    model?: string;
}

@Component({
    selector: 'app-agnes-image-card',
    standalone: true,
    imports: [CommonModule, TooltipDirective],
    templateUrl: './agnes-image-card.component.html',
    styleUrl: './agnes-image-card.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AgnesImageCardComponent {
    data = input<AgnesImageRenderData>({});

    imageSrc = computed(() => {
        const d = this.data();
        if (d.url) return d.url;
        if (d.b64Json) return `data:${d.mimeType ?? 'image/png'};base64,${d.b64Json}`;
        return '';
    });

    downloadHref = computed(() => this.imageSrc());

    downloadImage(): void {
        const href = this.downloadHref();
        if (!href) return;
        const a = document.createElement('a');
        a.href = href;
        a.download = '';
        a.target = '_blank';
        a.rel = 'noopener';
        a.click();
    }

    displaySize = computed(() => {
        const s = this.data().size;
        return s ? `${s}b` : '';
    });
}
