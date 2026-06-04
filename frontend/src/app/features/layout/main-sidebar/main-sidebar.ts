import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthStore } from '../../../core/store/auth.store';
import { ChatStore } from '../../../core/store/chat.store';
import { getUserRoleData } from '../../../core/enums/user-role.enum';
import { BadgeColor } from '../../../core/directives/badge-color.directive';
import { ThemeService } from '../../../core/services/theme.service';
import { IChatSession } from '../../../core/models/chat-session.interface';
import { ChatHistoryPreview } from '../../chat/chat-history-preview/chat-history-preview';

@Component({
	selector: 'app-main-sidebar',
	standalone: true,
	imports: [CommonModule, RouterLink, RouterLinkActive, BadgeColor, ChatHistoryPreview],
	templateUrl: './main-sidebar.html',
	styleUrl: './main-sidebar.css',
})
export class MainSidebar implements OnInit {
	protected authStore = inject(AuthStore);
	protected chatStore = inject(ChatStore);
	protected themeService = inject(ThemeService);

	protected readonly getUserRoleData = getUserRoleData;
	pendingDeleteSessionId = signal<number | null>(null);

	ngOnInit() {
		this.chatStore.loadSessions();
	}

	setPendingDelete(event: MouseEvent, sessionId: number) {
		event.preventDefault();
		event.stopPropagation();
		this.pendingDeleteSessionId.set(sessionId);
	}

	cancelDelete() {
		this.pendingDeleteSessionId.set(null);
	}

	confirmDelete() {
		const sessionId = this.pendingDeleteSessionId();
		if (sessionId === null) return;

		this.chatStore.deleteSession(sessionId);
		this.pendingDeleteSessionId.set(null);
	}

	displaySessionTitle(session: IChatSession): string {
		if (session.title === 'New chat...' || session.title === 'New chat') {
			return 'שיחה חדשה...';
		}

		return session.title;
	}
}
