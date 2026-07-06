import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ChatStore } from '../../../core/store/chat.store';
import { PageStates } from '../../../core/enums/page-states.enum';

@Component({
    selector: 'app-chat-history',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink],
    templateUrl: './chat-history.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrls: ['./chat-history.css'],
})
export class ChatHistory implements OnInit {
    private chatStore = inject(ChatStore);

    protected readonly PageStates = PageStates;

    searchQuery = signal('');
    pendingDeleteSessionId = signal<number | null>(null);

    filteredSessions = computed(() => {
        const query = this.searchQuery().toLowerCase();
        return this.chatStore.sessions().filter((session) => session.title.toLowerCase().includes(query));
    });

    hasSearch = computed(() => this.searchQuery().trim().length > 0);

    resultCountLabel = computed(() => {
        const count = this.filteredSessions().length;
        const suffix = this.hasSearch() ? 'תוצאות' : 'שיחות';
        return `${count} ${suffix}`;
    });

    currentSessionId = computed(() => this.chatStore.currentSessionId());
    pageState = computed<PageStates>(() => {
        if (this.chatStore.loading() && this.chatStore.sessions().length === 0) {
            return PageStates.Loading;
        }

        if (this.chatStore.error()) {
            return PageStates.Error;
        }

        if (this.chatStore.sessions().length === 0) {
            return PageStates.Empty;
        }

        return PageStates.Ready;
    });

    ngOnInit() {
        if (this.chatStore.sessions().length === 0) {
            this.chatStore.loadSessions();
        }
    }

    loadSessions() {
        this.chatStore.loadSessions();
    }

    onSearchChange(query: string) {
        this.searchQuery.set(query);
    }

    searchClear() {
        this.searchQuery.set('');
    }

    setPendingDelete(event: Event, id: number) {
        event.stopPropagation();
        this.pendingDeleteSessionId.set(id);
    }

    cancelDelete() {
        this.pendingDeleteSessionId.set(null);
    }

    confirmDelete() {
        const id = this.pendingDeleteSessionId();
        if (id) {
            this.chatStore.deleteSession(id);
            this.pendingDeleteSessionId.set(null);
        }
    }
}
