import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
	providedIn: 'root',
})
export class ChatService {
	private apiUrl = `${environment.apiUrl}/admin-agent/query-stream`;

	sendMessageStream(prompt: string): Observable<string> {
		return new Observable<string>((observer) => {
			const controller = new AbortController();

			fetch(this.apiUrl, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ prompt }),
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