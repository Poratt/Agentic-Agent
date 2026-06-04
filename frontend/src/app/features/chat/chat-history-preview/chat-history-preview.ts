import { Component, inject, OnInit, computed, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IChatSession } from '../../../core/models/chat-session.interface';
import { ChatStore } from '../../../core/store/chat.store';


@Component({
    selector: 'app-chat-history-preview',
    templateUrl: './chat-history-preview.html',
    styleUrl: './chat-history-preview.css',
    standalone: true,
    imports: [CommonModule, RouterLink]
})
export class ChatHistoryPreview implements OnInit, OnDestroy {
    protected chatStore = inject(ChatStore);

    isOpen = signal<boolean>(false);
    private hideTimeout?: ReturnType<typeof setTimeout>;

    recentSessions = computed(() => {
        return this.chatStore.recentSessions();
    });

    ngOnInit() {
        if (this.chatStore.sessions().length === 0) {
            this.chatStore.loadSessions();
        }
    }

    ngOnDestroy() {
        this.clearHideTimeout();
    }

    onMouseEnter() {
        this.clearHideTimeout();
        this.isOpen.set(true);
    }

    onMouseLeave() {
        this.startHideTimeout();
    }

    onMenuMouseEnter() {
        this.clearHideTimeout();
    }

    onMenuMouseLeave() {
        this.startHideTimeout();
    }

    private startHideTimeout() {
        this.clearHideTimeout();
        this.hideTimeout = setTimeout(() => {
            this.isOpen.set(false);
        }, 180);
    }

    private clearHideTimeout() {
        if (this.hideTimeout) {
            clearTimeout(this.hideTimeout);
            this.hideTimeout = undefined;
        }
    }

    displaySessionTitle(session: IChatSession): string {
        if (session.title === 'New chat...' || session.title === 'New chat') {
            return 'שיחה חדשה...';
        }
        return session.title;
    }
}