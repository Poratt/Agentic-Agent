import { Component, computed, input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ChatSessionsRenderData {
    sessions?: { id?: number; title?: string; createdAt?: string; updatedAt?: string }[];
}

@Component({
    selector: 'app-chat-sessions-list',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './chat-sessions-list.component.html',
    styleUrl: './chat-sessions-list.component.css',
    changeDetection: ChangeDetectionStrategy.Eager,
})
export class ChatSessionsListComponent {
    data = input.required<ChatSessionsRenderData>();

    sortedSessions = computed(() => {
        const sessions = this.data().sessions;
        if (!sessions) return [];
        return [...sessions].sort((a, b) => {
            const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
            const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
            return bTime - aTime;
        });
    });

    formatTime(dateStr?: string): string {
        if (!dateStr) return '';
        try {
            return new Date(dateStr).toLocaleString('he-IL');
        } catch {
            return dateStr;
        }
    }
}
