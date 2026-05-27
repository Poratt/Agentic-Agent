import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DynamicDialogRef } from 'primeng/dynamicdialog';
import { ChatStore } from '../../../core/store/chat.store';

@Component({
	selector: 'app-all-sessions-dialog',
	standalone: true,
	imports: [CommonModule],
	templateUrl: './all-sessions-dialog.html',
	styleUrl: './all-sessions-dialog.css',
})
export class AllSessionsDialog {
	protected chatStore = inject(ChatStore);
	private ref = inject(DynamicDialogRef);

	searchQuery = signal<string>('');

	filteredSessions = computed(() => {
		const query = this.searchQuery().toLowerCase().trim();
		const all = this.chatStore.sessions();

		if (!query) {
			return all;
		}

		return all.filter((session) => {
			return session.title.toLowerCase().includes(query);
		});
	});

	onSearchChange(event: Event) {
		const input = event.target as HTMLInputElement;
		this.searchQuery.set(input.value);
	}

	selectSession(sessionId: number) {
		this.ref.close(sessionId);
	}

	deleteSession(event: Event, sessionId: number) {
		event.stopPropagation();

		if (confirm('האם אתה בטוח שברצונך למחוק שיחה זו?')) {
			this.chatStore.deleteSession(sessionId);
		}
	}
}