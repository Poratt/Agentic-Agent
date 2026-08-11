import { Component, inject, signal, computed, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IdeasStore } from '../../../core/store/ideas.store';
import { PageStates } from '../../../core/enums/page-states.enum';
import { SavedIdeaSession } from '../../../core/models/saved-idea-session.model';
import { SavedIdea } from '../../../core/models/saved-idea.model';

type FilterMode = 'all' | 'nightly' | 'favorites';

@Component({
    selector: 'app-ideas-history',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './ideas-history.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    styleUrls: ['./ideas-history.css'],
})
export class IdeasHistory implements OnInit {
    protected ideasStore = inject(IdeasStore);

    protected readonly PageStates = PageStates;

    filterMode = signal<FilterMode>('all');
    expandedSessionId = signal<number | null>(null);
    pendingDeleteSessionId = signal<number | null>(null);

    filteredSessions = computed(() => {
        const sessions = this.ideasStore.sessions();
        const mode = this.filterMode();

        if (mode === 'nightly') {
            return sessions.filter((s) => s.nightly);
        }
        if (mode === 'favorites') {
            return sessions.filter((s) => s.ideas.some((idea) => idea.isFavorite));
        }
        return sessions;
    });

    currentSessionId = computed(() => this.ideasStore.currentSessionId());

    pageState = computed<PageStates>(() => {
        return this.ideasStore.historyPageState();
    });

    ngOnInit() {
        this.ideasStore.loadSessions();
    }

    setFilter(mode: FilterMode) {
        this.filterMode.set(mode);
    }

    toggleExpand(session: SavedIdeaSession) {
        if (this.expandedSessionId() === session.id) {
            this.expandedSessionId.set(null);
        } else {
            this.expandedSessionId.set(session.id);
            if (!session.ideas || session.ideas.length === 0) {
                this.ideasStore.loadSession(session.id);
            }
        }
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

    toggleFavorite(idea: SavedIdea) {
        this.ideasStore.toggleFavorite(idea.id, !idea.isFavorite);
    }

  getIdeasCount(session: SavedIdeaSession): number {
    if (session.ideasCount !== undefined) {
      return session.ideasCount;
    }
    return session.ideas?.length ?? 0;
  }

    refresh() {
        const mode = this.filterMode();
        const params: { nightly?: boolean; favorites?: boolean } = {};
        if (mode === 'nightly') params.nightly = true;
        if (mode === 'favorites') params.favorites = true;
        this.ideasStore.loadSessions(params);
    }

    getScoreClass(score: number): string {
        if (score >= 70) return 'score-high';
        if (score >= 40) return 'score-mid';
        return 'score-low';
    }
}
