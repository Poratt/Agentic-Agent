import { Component, input, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface AgnesVideoRenderData {
    url?: string;
    status?: string;
    seconds?: number | string;
    model?: string;
}

@Component({
    selector: 'app-agnes-video-card',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './agnes-video-card.component.html',
    styleUrl: './agnes-video-card.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AgnesVideoCardComponent {
    data = input<AgnesVideoRenderData>({});

    secondsLabel = computed(() => {
        const s = this.data().seconds;
        if (s === undefined || s === null || s === '') return '';
        const num = typeof s === 'string' ? Number(s) : s;
        if (!Number.isFinite(num)) return String(s);
        return `${num}s`;
    });
}
