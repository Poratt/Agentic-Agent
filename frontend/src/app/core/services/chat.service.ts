import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { IChatSession } from '../models/chat-session.interface';
import { IChatMessage } from '../models/chat-message.interface';

@Injectable({
	providedIn: 'root',
})
export class ChatService {
	private http = inject(HttpClient);
	private base = `${environment.apiUrl}/admin-agent`;

	listSessions(limit?: number): Observable<IChatSession[]> {
		const url = limit ? `${this.base}/sessions?limit=${limit}` : `${this.base}/sessions`;
		return this.http.get<IChatSession[]>(url);
	}

	getSessionMessages(sessionId: number): Observable<IChatMessage[]> {
		return this.http.get<IChatMessage[]>(`${this.base}/sessions/${sessionId}/messages`);
	}

	createSession(): Observable<IChatSession> {
		return this.http.post<IChatSession>(`${this.base}/sessions`, {});
	}

	deleteSession(sessionId: number): Observable<void> {
		return this.http.delete<void>(`${this.base}/sessions/${sessionId}`);
	}

	sendMessageStream(prompt: string, sessionId?: number): Observable<string> {
		return new Observable<string>((observer) => {
			const controller = new AbortController();

			fetch(`${this.base}/query-stream`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ prompt, sessionId }),
				credentials: 'include',
				signal: controller.signal,
			})
				.then(async (response) => {
					if (!response.ok) {
						observer.error(new Error(`Failed to initialize stream: ${response.statusText}`));
						return;
					}

					const reader = response.body?.getReader();
					const decoder = new TextDecoder('utf-8');

					if (!reader) {
						observer.error(new Error('Response body reader is not available'));
						return;
					}

					try {
						while (true) {
							const { done, value } = await reader.read();
							if (done) {
								break;
							}

							const chunk = decoder.decode(value, { stream: true });
							if (chunk) {
								observer.next(chunk);
							}
						}
						observer.complete();
					} catch (err) {
						observer.error(err);
					}
				})
				.catch((err) => {
					observer.error(err);
				});

			return () => {
				controller.abort();
			};
		});
	}
}