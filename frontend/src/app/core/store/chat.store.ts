import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, tap, throwError } from 'rxjs';
import { ChatService } from '../services/chat.service';
import { IChatSession } from '../models/chat-session.interface';

@Injectable({
	providedIn: 'root',
})
export class ChatStore {
	private chatService = inject(ChatService);
	private router = inject(Router);

	sessions = signal<IChatSession[]>([]);
	currentSessionId = signal<number | null>(null);
	loading = signal<boolean>(false);
	error = signal<string | null>(null);

	recentSessions = computed(() => {
		return this.sessions().slice(0, 5);
	});

	loadSessions(limit?: number) {
		this.loading.set(true);
		this.error.set(null);

		this.chatService.listSessions(limit).subscribe({
			next: (res) => {
				this.sessions.set(res ?? []);
				this.loading.set(false);
			},
			error: (err) => {
				this.error.set(err?.message ?? 'נכשל בטעינת השיחות.');
				this.loading.set(false);
			},
		});
	}

	createSession() {
		this.createSessionForMessage().subscribe();
	}

	createSessionForMessage(navigate = true): Observable<IChatSession> {
		this.loading.set(true);
		this.error.set(null);

		return this.chatService.createSession().pipe(
			tap((session) => {
				this.currentSessionId.set(session.id);
				this.loading.set(false);
				if (navigate) {
					this.router.navigate(['/chat'], { queryParams: { sessionId: session.id }, replaceUrl: true });
				}
			}),
			catchError((err) => {
				this.error.set(err?.message ?? 'נכשל ביצירת שיחה חדשה.');
				this.loading.set(false);
				return throwError(() => err);
			}),
		);
	}

	deleteSession(sessionId: number) {
		this.loading.set(true);
		this.error.set(null);

		this.chatService.deleteSession(sessionId).subscribe({
			next: () => {
				this.sessions.update((prev) => {
					return prev.filter((s) => {
						return s.id !== sessionId;
					});
				});

				if (this.currentSessionId() === sessionId) {
					this.currentSessionId.set(null);
					this.router.navigate(['/chat']);
				}

				this.loading.set(false);
			},
			error: (err) => {
				this.error.set(err?.message ?? 'נכשל במחיקת השיחה.');
				this.loading.set(false);
			},
		});
	}

	clearCurrentSession() {
		this.currentSessionId.set(null);
	}

	clearError() {
		this.error.set(null);
	}
}
