import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ChatStore } from '../../../core/store/chat.store';
import { PageStates } from '../../../core/enums/page-states.enum';
import { AccessToDirective } from "../../../core/directives/access-to.directive";

@Component({
	selector: 'app-chat-history',
	standalone: true,
	imports: [CommonModule, FormsModule, RouterLink, AccessToDirective],
	templateUrl: './chat-history.html',
	styleUrls: ['./chat-history.css'],
})
export class ChatHistory implements OnInit {
	private chatStore = inject(ChatStore);

	protected readonly PageStates = PageStates;

	searchQuery = signal('');
	pendingDeleteSessionId = signal<number | null>(null);

	filteredSessions = computed(() => {
		const query = this.searchQuery().toLowerCase();
		return this.chatStore.sessions().filter((session) =>
			session.title.toLowerCase().includes(query)
		);
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
