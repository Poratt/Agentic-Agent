import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthStore } from '../../../core/store/auth.store';
import { ChatStore } from '../../../core/store/chat.store';
import { getUserRoleData } from '../../../core/enums/user-role.enum';
import { BadgeColor } from '../../../core/directives/badge-color.directive';
import { TooltipDirective } from '../../../core/directives/tooltip.directive';
import { ThemeService } from '../../../core/services/theme.service';
import { Dropdown } from '../../../components/shared/dropdown/dropdown';

@Component({
    selector: 'app-main-sidebar',
    standalone: true,
    imports: [CommonModule, RouterLink, RouterLinkActive, BadgeColor, TooltipDirective, Dropdown],
    templateUrl: './main-sidebar.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './main-sidebar.css',
})
export class MainSidebar implements OnInit {
    protected authStore = inject(AuthStore);
    protected chatStore = inject(ChatStore);
    protected router = inject(Router);
    protected themeService = inject(ThemeService);

    protected readonly getUserRoleData = getUserRoleData;
    public pendingDeleteSessionId = signal<number | null>(null);

    ngOnInit() {
        this.chatStore.loadSessions();
    }

    public formattedSessions = computed(() => {
        return this.chatStore.recentSessions().map((session) => ({
            ...session,
            displayTitle:
                session.title === 'New chat...' || session.title === 'New chat' ? 'שיחה חדשה...' : session.title,
        }));
    });

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

    navigateTo(sessionId?: number) {
        if (sessionId !== undefined) {
            this.router.navigate(['/chat'], { queryParams: { sessionId } });
        } else {
            this.router.navigate(['/chat/history']);
        }
        this.pendingDeleteSessionId.set(null);
    }
}
