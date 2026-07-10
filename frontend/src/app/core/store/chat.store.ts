import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, finalize, tap, throwError } from 'rxjs';
import { ChatService } from '../services/chat.service';
import { IChatSession } from '../models/chat-session.interface';

@Injectable({
	providedIn: 'root',
})
export class ChatStore {
	private chatService = inject(ChatService);
	private router = inject(Router);

	private _sessions = signal<IChatSession[]>([]);
	private _loading = signal<boolean>(false);
	private _error = signal<string | null>(null);

	sessions = computed(() => this._sessions());
	loading = computed(() => this._loading());
	error = computed(() => this._error());

	currentSessionId = signal<number | null>(null);

	recentSessions = computed(() => {
		return this._sessions().slice(0, 5);
	});

	loadSessions(limit?: number) {
		this._loading.set(true);
		this._error.set(null);

		this.chatService
			.listSessions(limit)
			.pipe(finalize(() => this._loading.set(false)))
			.subscribe({
				next: (sessions) => {
					this._sessions.set(sessions);
				},
				error: (err) => {
					this._error.set(err?.message ?? 'נכשל בטעינת היסטוריית השיחות.');
				},
			});
	}

	reload() {
		this.loadSessions();
	}

	createSession() {
		this.createSessionForMessage().subscribe();
	}

	createSessionForMessage(navigate = true): Observable<IChatSession> {
		return this.chatService.createSession().pipe(
			tap((session) => {
				this.currentSessionId.set(session.id);
				this.loadSessions();
				if (navigate) {
					this.router.navigate(['/chat'], { queryParams: { sessionId: session.id }, replaceUrl: true });
				}
			}),
			catchError((err) => {
				this._error.set(err?.message ?? 'נכשל ביצירת שיחה חדשה.');
				return throwError(() => err);
			}),
		);
	}

	deleteSession(sessionId: number) {
		this.chatService.deleteSession(sessionId).subscribe({
			next: () => {
				this.loadSessions();

				if (this.currentSessionId() === sessionId) {
					this.currentSessionId.set(null);
					this.router.navigate(['/chat']);
				}
			},
			error: (err) => {
				this._error.set(err?.message ?? 'נכשל במחיקת השיחה.');
			},
		});
	}

	clearCurrentSession() {
		this.currentSessionId.set(null);
	}

	clearError() {
		this._error.set(null);
	}
}
