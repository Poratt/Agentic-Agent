import { Component, inject, signal, computed, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IdeasStore } from '../../../core/store/ideas.store';
import { PageStates } from '../../../core/enums/page-states.enum';
import { SavedIdeaSession } from '../../../core/models/saved-idea-session.model';
import { AccessToDirective } from '../../../core/directives/access-to.directive';
import { UserRole } from '../../../core/enums/user-role.enum';
import { IdeaCard } from "../idea-card/idea-card";
import { TooltipDirective } from '../../../core/directives/tooltip.directive';

type FilterMode = 'all' | 'nightly' | 'favorites';

@Component({
    selector: 'app-ideas-history',
    standalone: true,
    imports: [CommonModule, FormsModule, AccessToDirective, IdeaCard, TooltipDirective],
    templateUrl: './ideas-history.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    styleUrls: ['./ideas-history.css'],
})
export class IdeasHistory implements OnInit {
    protected ideasStore = inject(IdeasStore);

    protected readonly PageStates = PageStates;
    protected readonly UserRole = UserRole;

    triggerSuccess = signal<string | null>(null);

    filterMode = signal<FilterMode>('all');
    expandedSessionId = signal<number | null>(null);
    pendingDeleteSessionId = signal<number | null>(null);
    expandedIdeaIndex = signal(-1);
    initialLoadDone = false;

    filteredSessions = computed(() => {
        const sessions = this.ideasStore.sessions();
        const mode = this.filterMode();

        if (mode === 'nightly') {
            return sessions.filter((s) => s.nightly);
        }
        if (mode === 'favorites') {
            return sessions.filter((s) => s.ideas?.some((idea) => idea.isFavorite));
        }
        return sessions;
    });

    currentSessionId = computed(() => this.ideasStore.currentSessionId());

    pageState = computed<PageStates>(() => {
        return this.ideasStore.historyPageState();
    });

    ngOnInit() {
        this.ideasStore.loadSessions().then(() => {
            this.initialLoadDone = true;
        });
    }

    setFilter(mode: FilterMode) {
        this.filterMode.set(mode);
    }

    async toggleExpand(session: SavedIdeaSession) {
        if (this.expandedSessionId() === session.id) {
            this.expandedSessionId.set(null);
            return;
        }

        // Opening an unread nightly session marks all nightly sessions as read
        if (session.unread) {
            this.ideasStore.markNightlyRead();
        }

        // Load ideas BEFORE expanding — accordion animates to final height from the start
        if (!session.ideas || session.ideas.length === 0) {
            await this.ideasStore.loadSession(session.id);
            // Let Angular paint the new DOM cards before triggering the grid animation
            await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        }

        this.expandedSessionId.set(session.id);
        this.expandedIdeaIndex.set(-1);
    }

    toggleIdea(index: number): void {
        this.expandedIdeaIndex.update((current) => (current === index ? -1 : index));
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
            this.ideasStore.deleteSession(id);
            this.pendingDeleteSessionId.set(null);
            if (this.expandedSessionId() === id) {
                this.expandedSessionId.set(null);
            }
        }
    }

    toggleFavorite(event: { ideaId: number; isFavorite: boolean }) {
        this.ideasStore.toggleFavorite(event.ideaId, event.isFavorite);
    }

    getIdeasCount(session: SavedIdeaSession): number {
        if (session.ideasCount !== undefined) {
            return session.ideasCount;
        }
        return session.ideas?.length ?? 0;
    }

    private currentFilterParams(): { nightly?: boolean; favorites?: boolean } {
        const mode = this.filterMode();
        const params: { nightly?: boolean; favorites?: boolean } = {};
        if (mode === 'nightly') params.nightly = true;
        if (mode === 'favorites') params.favorites = true;
        return params;
    }

    refresh() {
        this.ideasStore.loadSessions(this.currentFilterParams());
    }

    async triggerNightly() {
        this.triggerSuccess.set(null);
        const expandedId = this.expandedSessionId();
        const message = await this.ideasStore.triggerNightly();
        if (message) {
            this.triggerSuccess.set(message);
            setTimeout(() => this.triggerSuccess.set(null), 5000);
        }
        // A manual run may have created new sessions — refresh the whole list
        // first, then refresh the details of the session that was expanded
        // before the click (it may have changed during the run).
        await this.ideasStore.loadSessions(this.currentFilterParams());
        if (expandedId) {
            await this.ideasStore.loadSession(expandedId);
        }
    }
}
