import { Component, input, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

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
    imports: [CommonModule],
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
}
