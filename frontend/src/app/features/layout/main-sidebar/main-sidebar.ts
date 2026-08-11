import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthStore } from '../../../core/store/auth.store';
import { ChatStore } from '../../../core/store/chat.store';
import { IdeasStore } from '../../../core/store/ideas.store';
import { TooltipDirective } from '../../../core/directives/tooltip.directive';
import { UserRole } from '../../../core/enums/user-role.enum';
import { Dropdown } from '../../../components/shared/dropdown/dropdown';

const SIDEBAR_COLLAPSED_KEY = 'sidebar-collapsed';

@Component({
    selector: 'app-main-sidebar',
    standalone: true,
    imports: [CommonModule, RouterLink, RouterLinkActive, TooltipDirective, Dropdown],
    templateUrl: './main-sidebar.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './main-sidebar.css',
})
export class MainSidebar implements OnInit {
    protected authStore = inject(AuthStore);
    protected chatStore = inject(ChatStore);
    protected ideasStore = inject(IdeasStore);
    protected router = inject(Router);
    protected isAdmin = computed(() => this.authStore.userRole() === UserRole.Admin);

    @ViewChild('chatDropdown') chatDropdown?: Dropdown;
    @ViewChild('ideasDropdown') ideasDropdown?: Dropdown;

    public collapsed = signal(this.loadCollapsed());
    public pendingDeleteSessionId = signal<number | null>(null);
    public pendingDeleteIdeaSessionId = signal<number | null>(null);

    ngOnInit() {
        this.chatStore.loadSessions();
        this.ideasStore.loadSessions();
    }

    public formattedSessions = computed(() => {
        return this.chatStore.recentSessions().map((session) => ({
            ...session,
            displayTitle:
                session.title === 'New chat...' || session.title === 'New chat' ? 'שיחה חדשה...' : session.title,
        }));
    });

    public formattedIdeaSessions = computed(() => {
        return this.ideasStore.recentSessions().map((session) => ({
            ...session,
            displayTitle: session.domain || 'ללא תחום',
        }));
    });

    toggleSidebar() {
        this.collapsed.update(v => !v);
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, JSON.stringify(this.collapsed()));
    }

    private loadCollapsed(): boolean {
        try {
            return JSON.parse(localStorage.getItem(SIDEBAR_COLLAPSED_KEY) ?? 'false');
        } catch {
            return false;
        }
    }

    setPendingDelete(event: MouseEvent, sessionId: number) {
        event.preventDefault();
        event.stopPropagation();
        this.pendingDeleteSessionId.set(sessionId);
        this.chatDropdown?.showDropdown();
    }

    cancelDelete() {
        this.pendingDeleteSessionId.set(null);
        this.chatDropdown?.hideDropdown();
    }

    confirmDelete() {
        const sessionId = this.pendingDeleteSessionId();
        if (sessionId === null) return;

        this.chatStore.deleteSession(sessionId);
        this.pendingDeleteSessionId.set(null);
        this.chatDropdown?.hideDropdown();
    }

    navigateTo(sessionId?: number) {
        if (sessionId !== undefined) {
            this.router.navigate(['/chat'], { queryParams: { sessionId } });
        } else {
            this.router.navigate(['/chat/history']);
        }
        this.pendingDeleteSessionId.set(null);
    }

    setPendingDeleteIdea(event: MouseEvent, sessionId: number) {
        event.preventDefault();
        event.stopPropagation();
        this.pendingDeleteIdeaSessionId.set(sessionId);
        this.ideasDropdown?.showDropdown();
    }

    cancelDeleteIdea() {
        this.pendingDeleteIdeaSessionId.set(null);
        this.ideasDropdown?.hideDropdown();
    }

    confirmDeleteIdea() {
        const sessionId = this.pendingDeleteIdeaSessionId();
        if (sessionId === null) return;

        this.ideasStore.deleteSession(sessionId);
        this.pendingDeleteIdeaSessionId.set(null);
        this.ideasDropdown?.hideDropdown();
    }

    navigateToIdeas(sessionId?: number) {
        if (sessionId !== undefined) {
            this.router.navigate(['/ideas/history'], { queryParams: { sessionId } });
        } else {
            this.router.navigate(['/ideas/history']);
        }
        this.pendingDeleteIdeaSessionId.set(null);
    }
}
