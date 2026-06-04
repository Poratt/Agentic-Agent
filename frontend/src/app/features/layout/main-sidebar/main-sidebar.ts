import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthStore } from '../../../core/store/auth.store';
import { ChatStore } from '../../../core/store/chat.store';
import { getUserRoleData } from '../../../core/enums/user-role.enum';
import { BadgeColor } from '../../../core/directives/badge-color.directive';
import { ThemeService } from '../../../core/services/theme.service';

@Component({
	selector: 'app-main-sidebar',
	standalone: true,
	imports: [CommonModule, RouterLink, RouterLinkActive, BadgeColor],
	templateUrl: './main-sidebar.html',
	styleUrl: './main-sidebar.css',
})
export class MainSidebar implements OnInit {
	protected authStore = inject(AuthStore);
	protected chatStore = inject(ChatStore);
	protected router = inject(Router);
	protected themeService = inject(ThemeService);

	protected readonly getUserRoleData = getUserRoleData;
	public pendingDeleteSessionId = signal<number | null>(null);
	public isButtonHovered = signal(false);


	public formattedSessions = computed(() => {
		return this.chatStore.recentSessions().map(session => ({
			...session,
			displayTitle: session.title === 'New chat...' || session.title === 'New chat'
				? 'שיחה חדשה...'
				: session.title
		}));
	});

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

	navigateToHistory() {
		this.router.navigate(['/chat/history']);
		this.hideDropdown();
	}

	navigateToSession(sessionId: number) {
		this.router.navigate(['/chat'], { queryParams: { sessionId } });
		this.hideDropdown();
	}

	showDropdown() {
		this.isButtonHovered.set(true);
	}

	hideDropdown() {
		this.isButtonHovered.set(false);
		this.pendingDeleteSessionId.set(null);
	}
}