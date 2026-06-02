import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ChatStore } from '../../../core/store/chat.store';

@Component({
	selector: 'app-chat-history',
	standalone: true,
	imports: [CommonModule, FormsModule, RouterLink],
	templateUrl: './chat-history.html',
	styleUrls: ['./chat-history.css'],
})
export class ChatHistory implements OnInit {
	private chatStore = inject(ChatStore);
	private router = inject(Router);

	searchQuery = signal('');
	pendingDeleteSessionId = signal<number | null>(null);

	filteredSessions = computed(() => {
		const query = this.searchQuery().toLowerCase();
		return this.chatStore.sessions().filter((session) =>
			session.title.toLowerCase().includes(query)
		);
	});

	currentSessionId = computed(() => this.chatStore.currentSessionId());
	loading = computed(() => this.chatStore.loading());

	ngOnInit() {
		if (this.chatStore.sessions().length === 0) {
			this.chatStore.loadSessions();
		}
	}

	onSearchChange(query: string) {
		this.searchQuery.set(query);
	}

	setPendingDelete(id: number) {
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
