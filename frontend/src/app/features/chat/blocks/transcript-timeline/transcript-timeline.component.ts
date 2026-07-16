import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface TranscriptRenderData {
    sessionId?: number;
    messages?: {
        role?: string;
        content?: string;
        createdAt?: string;
    }[];
}

@Component({
    selector: 'app-transcript-timeline',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './transcript-timeline.component.html',
    styleUrl: './transcript-timeline.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TranscriptTimelineComponent {
    data = input<TranscriptRenderData>({});

    isUser(role?: string): boolean {
        return role?.toLowerCase() === 'user';
    }

    isAssistant(role?: string): boolean {
        return role?.toLowerCase() === 'assistant';
    }
}
